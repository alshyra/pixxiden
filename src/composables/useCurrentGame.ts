import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useLibraryStore } from "@/stores/library";
import type { Game } from "@/types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { error as logError } from "@tauri-apps/plugin-log";

type UnlistenFn = () => void;

/**
 * Composable pour gérer le jeu courant basé sur l'ID de route
 * Centralise toutes les données et états liés au jeu actuel
 *
 * Utilisé par les Smart Components (GameInfoCard, GameActions, etc.)
 * pour accéder aux données du jeu sans prop drilling
 */
export function useCurrentGame() {
  const route = useRoute();
  const libraryStore = useLibraryStore();

  // === CORE STATE ===
  const gameId = computed(() => route.params.id as string);
  const game = computed<Game | undefined>(() => libraryStore.getGame(gameId.value));

  // === DOWNLOAD STATE ===
  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const downloadedSize = ref("0 MB");
  const downloadSpeed = ref("0 MB/s");

  // === LAUNCH STATE ===
  const isLaunching = ref(false);
  const launchError = ref<string | null>(null);

  // === TAURI HELPERS ===
  const listeners: UnlistenFn[] = [];

  const safeListen = async (event: string, handler: (event: any) => void): Promise<UnlistenFn> => {
    try {
      const unlisten = await listen(event, handler);
      listeners.push(unlisten);
      return unlisten;
    } catch {
      return () => {};
    }
  };

  // === COMPUTED PROPERTIES ===
  const heroImage = computed(() => {
    if (!game.value) return "";
    if (game.value.heroPath) {
      try {
        return convertFileSrc(game.value.heroPath);
      } catch {
        return game.value.backgroundUrl || "";
      }
    }
    return game.value.backgroundUrl || "";
  });

  const coverImage = computed(() => {
    if (!game.value) return "";
    // Prefer local cover, then local grid, then legacy URL
    const localPath = game.value.coverPath || game.value.gridPath;
    if (localPath) {
      try {
        return convertFileSrc(localPath);
      } catch {
        return game.value.coverUrl || "";
      }
    }
    return game.value.coverUrl || "";
  });

  const screenshots = computed(() => {
    if (!game.value?.screenshotPaths?.length) return [];
    return game.value.screenshotPaths
      .map((path) => {
        try {
          return convertFileSrc(path);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
  });

  const releaseYear = computed(() => {
    if (!game.value?.releaseDate) return undefined;
    return new Date(game.value.releaseDate).getFullYear();
  });

  const score = computed(() => {
    if (!game.value) return undefined;
    return game.value.metacriticScore || Math.round(game.value.igdbRating || 0) || undefined;
  });

  const gameDuration = computed(() => {
    if (!game.value) return undefined;
    const { hltbMain, hltbComplete } = game.value;
    if (!hltbMain && !hltbComplete) return undefined;
    return hltbMain && hltbComplete
      ? `${hltbMain}-${hltbComplete}h`
      : hltbMain
        ? `~${hltbMain}h`
        : undefined;
  });

  const achievementsProgress = computed(() => {
    if (!game.value?.achievementsTotal) return null;
    return {
      total: game.value.achievementsTotal,
      unlocked: game.value.achievementsUnlocked || 0,
    };
  });

  const formattedPlayTime = computed(() => {
    const minutes = game.value?.playTimeMinutes || 0;
    if (minutes === 0) return "0h";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  });

  const formattedLastPlayed = computed(() => {
    if (!game.value?.lastPlayed) return "Jamais";
    return new Date(game.value.lastPlayed).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  });

  const completionStatus = computed(() => {
    const minutes = game.value?.playTimeMinutes || 0;
    if (minutes === 0) return "Non joué";
    if (minutes > 3600) return "Terminé";
    if (minutes > 1200) return "En cours";
    return "Commencé";
  });

  const launchRunner = computed(() => {
    if (!game.value) return undefined;
    const runners: Record<string, string> = {
      epic: "Legendary (Epic Games)",
      gog: "GOGdl (GOG Galaxy)",
      amazon: "Nile (Amazon Games)",
      steam: "Steam",
    };
    return runners[game.value.store] || game.value.store;
  });

  const totalSize = computed(() => game.value?.installSize || "N/A");

  // === ACTIONS ===
  async function playGame() {
    if (!game.value) return;

    launchError.value = null;
    isLaunching.value = true;

    try {
      await libraryStore.launchGame(game.value.id);
    } catch (error: any) {
      launchError.value = error?.message || error?.toString() || "Unknown error";
      logError(`Failed to launch game: ${error}`);
    }
  }

  async function forceCloseGame() {
    if (!game.value) return;

    try {
      await invoke("force_close_game", { gameId: game.value.id });
    } catch (error) {
      logError(`Failed to force close game: ${error}`);
    } finally {
      isLaunching.value = false;
      launchError.value = null;
    }
  }

  async function startInstallation(installPath?: string) {
    if (!game.value) return;

    isDownloading.value = true;
    downloadProgress.value = 0;

    try {
      await libraryStore.installGame(game.value.id, installPath);
    } catch (error) {
      logError(`Failed to start installation: ${error}`);
      isDownloading.value = false;
    }
  }

  function closeLaunchOverlay() {
    isLaunching.value = false;
    launchError.value = null;
  }

  // === TAURI EVENT SETUP ===
  async function setupEventListeners() {
    await safeListen("game-launching", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        isLaunching.value = true;
        launchError.value = null;
      }
    });

    await safeListen("game-launched", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        setTimeout(() => (isLaunching.value = false), 500);
      }
    });

    await safeListen("game-launch-failed", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        launchError.value = event.payload?.error || "Unknown error";
      }
    });

    await safeListen("game-installing", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        isDownloading.value = true;
        downloadProgress.value = 0;
      }
    });

    await safeListen("game-install-progress", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = event.payload.progress || 0;
        downloadedSize.value = event.payload.downloaded || "0 MB";
        downloadSpeed.value = event.payload.speed || "0 MB/s";
      }
    });

    await safeListen("game-installed", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = 100;
        setTimeout(() => {
          isDownloading.value = false;
          libraryStore.fetchGames();
        }, 1500);
      }
    });

    await safeListen("game-install-failed", (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        isDownloading.value = false;
        logError(`Install failed: ${event.payload?.error}`);
      }
    });
  }

  function cleanup() {
    listeners.forEach((unlisten) => unlisten());
    listeners.length = 0;
  }

  return {
    // Core
    gameId,
    game,

    // Computed data
    heroImage,
    coverImage,
    screenshots,
    releaseYear,
    score,
    gameDuration,
    achievementsProgress,
    formattedPlayTime,
    formattedLastPlayed,
    completionStatus,
    launchRunner,
    totalSize,

    // Download state
    isDownloading,
    downloadProgress,
    downloadedSize,
    downloadSpeed,

    // Launch state
    isLaunching,
    launchError,

    // Actions
    playGame,
    forceCloseGame,
    startInstallation,
    closeLaunchOverlay,

    // Lifecycle
    setupEventListeners,
    cleanup,
  };
}
