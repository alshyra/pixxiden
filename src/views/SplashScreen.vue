<template>
  <div
    class="flex flex-col items-center justify-center w-full h-full border border-white/5 bg-[#0a0a0c]"
  >
    <PixxidenLogo class="mb-[3rem]" :glow="true" :is-loading="true" :size="140" />

    <!-- Titre -->
    <h1
      class="text-4xl font-black tracking-[0.4em] mb-10 bg-gradient-to-r from-white via-blue-100 to-gray-500 bg-clip-text text-transparent italic"
    >
      PIXXIDEN
    </h1>

    <!-- Barre de progression -->
    <div class="w-64 mb-4">
      <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-[#5e5ce6] rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>

    <!-- Statut -->
    <div class="flex flex-col items-center gap-3">
      <p class="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold">
        {{ statusMessage }}
      </p>
      <!-- Jeu en cours de sync -->
      <p v-if="currentGame" class="text-[9px] text-white/50 font-medium max-w-64 truncate">
        {{ currentGame }}
      </p>
      <div
        class="w-32 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { debug, info, warn, error as logError } from "@tauri-apps/plugin-log";
import { PixxidenLogo } from "@/components/ui";
import { initializeServices } from "@/services";
import { GameSyncService } from "@/lib/sync";
import { GameRepository, UmuRepository } from "@/lib/database";
import { useLibraryStore } from "@/stores/library";
import { useDownloadsStore } from "@/stores/downloads";

const emit = defineEmits<{ ready: [] }>();

const statusMessage = ref("Initialisation...");
const currentGame = ref("");
const progress = ref(0);
const MINIMAL_DISPLAY_TIME = 2000; // 2 seconds minimum

let unlistenProgress: UnlistenFn | null = null;

// Progress event payload from GameSyncService
interface SyncProgressPayload {
  store: string;
  gameTitle: string;
  current: number;
  total: number;
  phase: string;
  message: string;
}

onMounted(async () => {
  const startTime = Date.now();

  // Listen for progress events from GameSyncService (used only during first-run blocking sync)
  try {
    unlistenProgress = await listen<SyncProgressPayload>("splash-progress", (event) => {
      debug(`Splash progress: ${event.payload.phase} - ${event.payload.message}`);
      const { gameTitle, current, total, phase, message } = event.payload;

      statusMessage.value = message || "Synchronisation...";
      currentGame.value = gameTitle || "";

      if (phase === "fetching" && total > 0) {
        progress.value = Math.min(40 + (current / total) * 20, 60);
      } else if (phase === "enriching" && total > 0) {
        progress.value = Math.min(60 + (current / total) * 30, 90);
      } else if (phase === "complete") {
        progress.value = 95;
      }
    });
  } catch (e) {
    warn(`Failed to setup splash progress listener: ${e}`);
  }

  try {
    // Step 1: Initialize services (DB, sidecar, etc.)
    statusMessage.value = "Chargement des modules...";
    progress.value = 10;
    await initializeServices();

    // Step 2: Check if games already exist in SQLite
    statusMessage.value = "Détection des stores...";
    progress.value = 25;
    const gameRepo = GameRepository.getInstance();
    const gamesCount = await gameRepo.getGamesCount();

    if (gamesCount > 0) {
      // ===== FAST PATH: Games exist → load from DB and show UI immediately =====
      await info(`Found ${gamesCount} games in database — instant startup`);
      statusMessage.value = "Chargement de la bibliothèque...";
      progress.value = 80;

      // Load games into Pinia store from SQLite (instant)
      const libraryStore = useLibraryStore();
      libraryStore.initialized = true;
      await libraryStore.fetchGames();

      currentGame.value = "";
      statusMessage.value = "Lancement...";
      progress.value = 100;

      // Emit ready ASAP — user sees the UI
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed);
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
      emit("ready");

      // ===== BACKGROUND: Trigger UMU DB sync + library sync as background tasks =====
      const downloadsStore = useDownloadsStore();

      // Background task 1: Sync UMU database (if stale)
      const umuRepo = UmuRepository.getInstance();
      if (await umuRepo.needsRefresh()) {
        downloadsStore.startBackgroundTask("umu-sync", "Mise à jour base UMU", async (task) => {
          const count = await umuRepo.syncFromApi();
          task.detail = `${count} entrées synchronisées`;
        });
      }

      // Background task 2: Sync game libraries from stores
      downloadsStore.startBackgroundTask("sync", "Synchronisation des bibliothèques", async (task) => {
        try {
          const syncService = GameSyncService.getInstance();
          let storesCompleted = 0;
          const totalStores = 4;
          const result = await syncService.sync({
            skipEnrichment: true,
            onProgress: (event) => {
              task.detail = event.message;
              if (event.phase === "complete") {
                task.progress = 100;
              } else if (event.store && event.store !== "" && event.phase === "fetching" && event.current > 0) {
                // A store finished fetching
                storesCompleted++;
                task.progress = Math.round((storesCompleted / totalStores) * 75);
              } else if (task.progress === 0) {
                // First event — show a bit of progress so the bar is visible
                task.progress = 5;
              }
            },
          });
          // Refresh library after sync
          await libraryStore.fetchGames();
          task.detail = `${result.total} jeux synchronisés`;
        } catch (error) {
          await warn(`Background sync failed: ${error}`);
          throw error;
        }
      });

      return; // Don't run finally block — ready already emitted
    }

    // ===== FIRST RUN: No games in DB → blocking sync =====
    await info("No games found, starting initial sync...");
    statusMessage.value = "Synchronisation des jeux...";
    progress.value = 40;

    try {
      const syncService = GameSyncService.getInstance();
      await syncService.sync({ skipEnrichment: false });
    } catch (error) {
      await warn(`Sync failed (may need authentication or stores not configured): ${error}`);
      progress.value = 60;
    }

    // Load games into Pinia store
    const libraryStore = useLibraryStore();
    libraryStore.initialized = true;
    await libraryStore.fetchGames();

    currentGame.value = "";
    statusMessage.value = "Lancement...";
    progress.value = 100;
  } catch (error) {
    await logError(`Error during splash screen initialization: ${error}`);
    statusMessage.value = "Chargement terminé";
    progress.value = 100;
  } finally {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed);
    await new Promise((resolve) => setTimeout(resolve, remainingTime));
    emit("ready");
  }
});

onUnmounted(() => {
  unlistenProgress?.();
});
</script>
