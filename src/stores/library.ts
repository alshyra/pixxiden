import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { Game } from "@/types";
import { getOrchestrator, initializeServices, type LibrarySyncResult } from "@/services";

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
      console.log("🎮 Services initialized");
    } catch (err) {
      error.value = "Failed to initialize services";
      console.error("🎮 Init error:", err);
    }
  }

  async function fetchGames() {
    console.log("🎮 fetchGames()");
    loading.value = true;
    error.value = null;

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const data = await orchestrator.getAllGames();
      console.log("🎮 Got", data.length, "games from DB");

      // If no games in DB and never synced, auto-sync
      if (data.length === 0 && !hasSynced.value) {
        console.log("🎮 No games, triggering sync...");
        await syncLibrary();
        return;
      }

      games.value = data;
    } catch (err) {
      error.value = "Failed to fetch games";
      console.error("🎮 Error:", err);
    } finally {
      loading.value = false;
    }
  }

  async function syncLibrary() {
    console.log("🎮 syncLibrary()");
    syncing.value = true;
    loading.value = true;
    error.value = null;
    syncErrors.value = [];

    try {
      if (!initialized.value) await initialize();

      const orchestrator = getOrchestrator();
      const result: LibrarySyncResult = await orchestrator.syncLibrary();

      console.log("🎮 Sync result:", result);
      syncErrors.value = result.errors.map((e) => `${e.store}: ${e.error}`);
      hasSynced.value = true;

      // Refresh games after sync
      const data = await orchestrator.getAllGames();
      games.value = data;
      console.log("🎮 Loaded", data.length, "games");
    } catch (err) {
      error.value = "Failed to sync library";
      console.error("🎮 Sync error:", err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
      throw err;
    }
  }

  // TODO: Migrer scan GOG vers GogdlService
  async function scanGogInstalled() {
    console.log("🎮 scanGogInstalled() - TODO: migrate to services");
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
