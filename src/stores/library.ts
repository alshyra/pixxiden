import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { emit } from "@tauri-apps/api/event";
import { debug, info, error as logError } from "@tauri-apps/plugin-log";
import type { Game } from "@/types";
import type { OverridableAssetType } from "@/lib/database";
import {
  getOrchestrator,
  getInstallationService,
  getGameLaunchService,
  initializeServices,
  type SyncResult,
} from "@/services";

export const useLibraryStore = defineStore("library", () => {
  // All games
  const games = ref<Game[]>([]);
  const selectedGame = ref<Game | null>(null);
  const loading = ref(false);
  const syncing = ref(false);
  const error = ref<string | null>(null);
  const syncErrors = ref<string[]>([]);
  const hasSynced = ref(false);
  const initialized = ref(false);

  // Computed: Get a game by ID
  const getGame = computed(() => (gameId: string) => {
    return games.value.find((g) => g.id === gameId);
  });

  /**
   * Initialize services (called once at app start)
   */
  async function initialize() {
    if (initialized.value) return;

    try {
      await initializeServices();
      initialized.value = true;
      await info("Library store: services initialized");
    } catch (err) {
      error.value = "Failed to initialize services";
      await logError(`Library store init error: ${err}`);
    }
  }

  /**
   * Fetch games from SQLite
   * Initial sync is handled by SplashScreen, so this just reads from DB.
   */
  async function fetchGames() {
    await debug("fetchGames()");
    loading.value = true;
    error.value = null;

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const data = await orchestrator.getAllGames();
      await info(`Got ${data.length} games from DB`);
      games.value = data;
    } catch (err) {
      error.value = "Failed to fetch games";
      await logError(`fetchGames error: ${err}`);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Sync library with all authenticated stores
   * Delegates to GameSyncService via the orchestrator.
   *
   * @param forceEnrich  Force re-enrichment even for already-enriched games.
   * @param asBackgroundTask  When true, runs as a background task visible in the Downloads
   *                          view (fire-and-forget). When false (default), runs inline and
   *                          blocks the caller (used by SplashScreen).
   */
  async function syncLibrary(forceEnrich: boolean = false, asBackgroundTask: boolean = false) {
    await debug("syncLibrary()");

    if (asBackgroundTask) {
      // ── Background mode: register as a Downloads task with progress bar ──
      syncing.value = true;

      const { useDownloadsStore } = await import("./downloads");
      const downloadsStore = useDownloadsStore();

      await downloadsStore.startBackgroundTask(
        "sync",
        "Synchronisation bibliothèque",
        async (task) => {
          try {
            if (!initialized.value) await initialize();

            const orchestrator = getOrchestrator();
            const result: SyncResult = await orchestrator.syncLibrary({
              forceEnrich,
              onProgress: (event) => {
                if (event.total > 0) {
                  task.progress = Math.round((event.current / event.total) * 100);
                }
                task.detail = event.message;
              },
            });

            syncErrors.value = result.errors.map(
              (e) => `${e.store || e.gameTitle || "unknown"}: ${e.message}`,
            );
            hasSynced.value = true;

            // Refresh games from DB after sync
            games.value = await orchestrator.getAllGames();
            await info(
              `Sync (background) result: ${result.total} total, ${result.errors.length} errors`,
            );
          } finally {
            syncing.value = false;
            loading.value = false;
          }
        },
      );
      return;
    }

    // ── Inline mode (SplashScreen / SettingsSystem) ──
    syncing.value = true;
    loading.value = true;
    error.value = null;
    syncErrors.value = [];

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const result: SyncResult = await orchestrator.syncLibrary({ forceEnrich });

      await info(`Sync result: ${result.total} total, ${result.errors.length} errors`);
      syncErrors.value = result.errors.map(
        (e) => `${e.store || e.gameTitle || "unknown"}: ${e.message}`,
      );
      hasSynced.value = true;

      // Refresh games from DB after sync
      games.value = await orchestrator.getAllGames();
      await info(`Loaded ${games.value.length} games after sync`);
    } catch (err) {
      error.value = "Failed to sync library";
      await logError(`Sync error: ${err}`);
    } finally {
      loading.value = false;
      syncing.value = false;
    }
  }

  async function launchGame(gameId: string) {
    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const { game, launchCommand, env } = await orchestrator.prepareGameLaunch(gameId);

      // Launch via sidecar streaming — JS-first, no Rust invoke needed
      const launchService = getGameLaunchService();
      await launchService.launchFromCommand(game, launchCommand, env);

      // Emit event for App.vue to notify GameOverlay
      await emit("game-launched", { gameId, game });

      // Update last played locally
      const localGame = games.value.find((g) => g.id === gameId);
      if (localGame) {
        const now = new Date().toISOString();
        localGame.gameCompletion.lastPlayed = now;
        await orchestrator.updateGameMetadata(gameId, { lastPlayed: now });
      }
    } catch (err) {
      error.value = "Failed to launch game";
      await logError(`Launch error: ${err}`);
      await emit("game-launch-error", { gameId });
      throw err;
    }
  }

  async function installGame(gameId: string, installPath?: string) {
    try {
      const game = games.value.find((g) => g.id === gameId || g.storeData.storeId === gameId);
      if (!game) throw new Error(`Game not found: ${gameId}`);

      game.gameCompletion.downloading = true;
      game.gameCompletion.downloadProgress = 0;

      const installationService = getInstallationService();
      await installationService.installGame(game.id, game.storeData.store, {
        installPath,
        onProgress: (progress) => {
          game.gameCompletion.downloadProgress = progress.progress;
          if (progress.status === "completed") {
            game.gameCompletion.downloading = false;
            game.installation.installed = true;
            if (installPath) game.installation.installPath = installPath;
          } else if (progress.status === "error") {
            game.gameCompletion.downloading = false;
          }
        },
      });
    } catch (err) {
      error.value = "Failed to install game";
      await logError(`Install error: ${err}`);
      throw err;
    }
  }

  async function uninstallGame(gameId: string) {
    try {
      const game = games.value.find((g) => g.id === gameId || g.storeData.storeId === gameId);
      if (!game) throw new Error(`Game not found: ${gameId}`);

      const installationService = getInstallationService();
      await installationService.uninstallGame(game.id, game.storeData.store);

      // Update game state
      game.installation.installed = false;
      game.installation.installPath = "";
    } catch (err) {
      error.value = "Failed to uninstall game";
      await logError(`Uninstall error: ${err}`);
      throw err;
    }
  }

  function selectGameById(gameId: string) {
    selectedGame.value = games.value.find((g) => g.id === gameId) || null;
  }

  /**
   * Recherche dans la bibliothèque
   */
  async function searchGames(query: string): Promise<Game[]> {
    if (!initialized.value) await initialize();
    const orchestrator = getOrchestrator();
    return orchestrator.searchGames(query);
  }

  /**
   * Récupère les jeux récemment joués
   */
  async function getRecentlyPlayed(limit: number = 10): Promise<Game[]> {
    if (!initialized.value) await initialize();
    const orchestrator = getOrchestrator();
    return orchestrator.getRecentlyPlayed(limit);
  }

  /**
   * Récupère les favoris
   */
  async function getFavorites(): Promise<Game[]> {
    if (!initialized.value) await initialize();
    const orchestrator = getOrchestrator();
    return orchestrator.getFavorites();
  }

  /**
   * Toggle favoris
   */
  async function toggleFavorite(gameId: string) {
    if (!initialized.value) await initialize();

    const game = games.value.find((g) => g.id === gameId);
    if (!game) return;

    const newValue = !game.gameCompletion.isFavorite;
    game.gameCompletion.isFavorite = newValue;

    const orchestrator = getOrchestrator();
    await orchestrator.updateGameMetadata(gameId, { isFavorite: newValue });
  }

  /**
   * Update the Windows executable path (.exe) for umu-run direct launch
   */
  async function updateExecutablePath(gameId: string, executablePath: string) {
    if (!initialized.value) await initialize();

    const orchestrator = getOrchestrator();
    await orchestrator.updateExecutablePath(gameId, executablePath);

    // Update local state
    const game = games.value.find((g) => g.id === gameId);
    if (game) {
      game.installation.executablePath = executablePath;
    }
  }

  /**
   * Apply an image override: update the local reactive Game asset path.
   * The caller is responsible for persisting to ImageOverrideRepository.
   */
  function applyAssetOverride(gameId: string, assetType: OverridableAssetType, path: string) {
    const game = games.value.find((g) => g.id === gameId);
    if (!game) return;

    const fieldMap: Record<OverridableAssetType, keyof Game["assets"]> = {
      hero: "heroPath",
      grid: "gridPath",
      horizontal_grid: "horizontalGridPath",
      logo: "logoPath",
      icon: "iconPath",
    };

    const field = fieldMap[assetType];
    if (field && field !== "screenshotPaths") {
      (game.assets[field] as string) = path;
    }
  }

  /**
   * Revert an image override: re-fetch the game from DB to get the original enriched asset paths.
   */
  async function revertAssetOverride(gameId: string) {
    if (!initialized.value) await initialize();

    const orchestrator = getOrchestrator();
    const freshGames = await orchestrator.getAllGames();
    const freshGame = freshGames.find((g) => g.id === gameId);
    if (!freshGame) return;

    const localGame = games.value.find((g) => g.id === gameId);
    if (localGame) {
      localGame.assets = { ...freshGame.assets };
    }
  }

  return {
    games,
    selectedGame,
    loading,
    syncing,
    error,
    syncErrors,
    initialized,
    getGame,
    initialize,
    fetchGames,
    syncLibrary,
    launchGame,
    installGame,
    uninstallGame,
    selectGameById,
    searchGames,
    getRecentlyPlayed,
    getFavorites,
    toggleFavorite,
    updateExecutablePath,
    applyAssetOverride,
    revertAssetOverride,
  };
});
