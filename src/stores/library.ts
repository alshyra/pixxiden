import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { debug, info, error as logError } from "@tauri-apps/plugin-log";
import type { Game } from "@/types";
import { getOrchestrator, initializeServices, type SyncResult } from "@/services";

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
   * Fetch games from SQLite (pure TypeScript — no Rust invoke)
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
   * Delegates to GameSyncService via the orchestrator
   */
  async function syncLibrary() {
    await debug("syncLibrary()");
    syncing.value = true;
    loading.value = true;
    error.value = null;
    syncErrors.value = [];

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const result: SyncResult = await orchestrator.syncLibrary();

      await info(`Sync result: ${result.total} total, ${result.errors.length} errors`);
      syncErrors.value = result.errors.map(
        (e) => `${e.store || e.gameTitle || "unknown"}: ${e.message}`,
      );
      hasSynced.value = true;

      // Refresh games from DB after sync
      const data = await orchestrator.getAllGames();
      games.value = data;
      await info(`Loaded ${data.length} games after sync`);
    } catch (err) {
      error.value = "Failed to sync library";
      await logError(`Sync error: ${err}`);
    } finally {
      loading.value = false;
      syncing.value = false;
    }
  }

  /**
   * Force re-sync: re-fetches games and forces re-enrichment of all games
   * Useful for updating metadata after initial sync or fixing broken data
   */
  async function resyncLibrary() {
    await debug("resyncLibrary()");
    syncing.value = true;
    loading.value = true;
    error.value = null;
    syncErrors.value = [];

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const result: SyncResult = await orchestrator.resyncLibrary();

      await info(`Re-sync result: ${result.total} total, ${result.enriched} enriched, ${result.errors.length} errors`);
      syncErrors.value = result.errors.map(
        (e) => `${e.store || e.gameTitle || "unknown"}: ${e.message}`,
      );
      hasSynced.value = true;

      // Refresh games from DB after sync
      const data = await orchestrator.getAllGames();
      games.value = data;
      await info(`Loaded ${data.length} games after re-sync`);
    } catch (err) {
      error.value = "Failed to re-sync library";
      await logError(`Re-sync error: ${err}`);
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

      // Appel Rust avec toutes les données (pas de lookup en Rust)
      await invoke("launch_game_v2", {
        game: {
          id: game.id,
          title: game.title,
          store: game.store,
          storeId: game.storeId,
          appName: game.storeId, // app_name = storeId
          installPath: game.installPath,
          customExecutable: game.customExecutable,
        },
        launchCommand,
        env,
      });

      // Update last played locally
      const localGame = games.value.find((g) => g.id === gameId);
      if (localGame) {
        const now = new Date().toISOString();
        localGame.lastPlayed = now;
        // Persist in DB
        await orchestrator.updateGameMetadata(gameId, { lastPlayed: now });
      }
    } catch (err) {
      error.value = "Failed to launch game";
      await logError(`Launch error: ${err}`);
      throw err;
    }
  }

  // TODO: Migrer install/uninstall vers les nouveaux services
  async function installGame(gameId: string, _installPath?: string) {
    try {
      const game = games.value.find((g) => g.id === gameId || g.storeId === gameId);
      if (game) {
        game.downloading = true;
        game.downloadProgress = 0;
      }

      // Pour l'instant, on garde l'ancien invoke Rust
      await invoke("install_game", { id: gameId });
    } catch (err) {
      error.value = "Failed to install game";
      await logError(`Install error: ${err}`);
      throw err;
    }
  }

  async function uninstallGame(gameId: string) {
    try {
      // Pour l'instant, on garde l'ancien invoke Rust
      await invoke("uninstall_game", { id: gameId });

      // Update game state
      const game = games.value.find((g) => g.id === gameId || g.storeId === gameId);
      if (game) {
        game.installed = false;
        game.installPath = "";
      }
    } catch (err) {
      error.value = "Failed to uninstall game";
      await logError(`Uninstall error: ${err}`);
      throw err;
    }
  }

  // TODO: Migrer scan GOG vers GogdlService
  async function scanGogInstalled() {
    await debug("scanGogInstalled() - TODO: migrate to services");
    // Temporairement désactivé pendant la migration
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
   * TODO: Ajouter isFavorite au type Game
   */
  async function toggleFavorite(gameId: string) {
    if (!initialized.value) await initialize();

    const game = games.value.find((g) => g.id === gameId);
    if (!game) return;

    // TODO: Une fois isFavorite ajouté au type Game:
    // const newValue = !game.isFavorite;
    // game.isFavorite = newValue;
    const newValue = true; // Placeholder

    const orchestrator = getOrchestrator();
    await orchestrator.updateGameMetadata(gameId, { isFavorite: newValue });
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
    resyncLibrary,
    scanGogInstalled,
    launchGame,
    installGame,
    uninstallGame,
    selectGameById,
    searchGames,
    getRecentlyPlayed,
    getFavorites,
    toggleFavorite,
  };
});
