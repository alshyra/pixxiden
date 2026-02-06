<template>
  <div class="flex flex-col items-center justify-center w-full h-full border border-white/5 bg-[#0a0a0c]">
    <PixxidenLogo class="mb-[3rem]" :glow="true" :is-loading="true" :size="140" />

    <!-- Titre -->
    <h1
      class="text-4xl font-black tracking-[0.4em] mb-10 bg-gradient-to-r from-white via-blue-100 to-gray-500 bg-clip-text text-transparent italic">
      PIXXIDEN
    </h1>

    <!-- Barre de progression -->
    <div class="w-64 mb-4">
      <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-[#5e5ce6] rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"></div>
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
      <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { PixxidenLogo } from "@/components/ui";
import { initializeServices } from "@/services";
import { GameSyncService } from "@/lib/sync";
import { GameRepository } from "@/lib/database";

const emit = defineEmits<{ ready: [] }>();

const statusMessage = ref("Initialisation...");
const currentGame = ref("");
const progress = ref(0);
const MINIMAL_DISPLAY_TIME = 3000; // 3 seconds minimum

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

  // Listen for progress events from GameSyncService
  try {
    unlistenProgress = await listen<SyncProgressPayload>("splash-progress", (event) => {
      console.log("📊 Splash progress:", event.payload);
      const { gameTitle, current, total, phase, message } = event.payload;

      statusMessage.value = message || "Synchronisation...";
      currentGame.value = gameTitle || "";

      // Calculate progress based on phase
      if (phase === "fetching" && total > 0) {
        progress.value = Math.min(40 + (current / total) * 20, 60);
      } else if (phase === "enriching" && total > 0) {
        progress.value = Math.min(60 + (current / total) * 30, 90);
      } else if (phase === "complete") {
        progress.value = 95;
      }
    });
  } catch (e) {
    console.warn("Failed to setup splash progress listener:", e);
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

    // Step 3: If no games, perform initial sync
    if (gamesCount === 0) {
      try {
        console.log("🎮 No games found, starting initial sync...");
        statusMessage.value = "Synchronisation des jeux...";
        progress.value = 40;
        // GameSyncService handles everything: fetch → enrich → persist
        // Progress events are emitted automatically
        const syncService = GameSyncService.getInstance();
        await syncService.sync();
      } catch (error) {
        console.warn(
          "🎮 Initial sync failed (may need authentication or stores not configured):",
          error,
        );
        // Don't block — continue with empty library
      }
    } else {
      console.log(`🎮 Found ${gamesCount} games in database`);
      progress.value = 90;
    }

    currentGame.value = "";
    statusMessage.value = "Lancement...";
    progress.value = 100;
  } catch (error) {
    console.error("🎮 Error during splash screen initialization:", error);
    statusMessage.value = "Chargement terminé";
    progress.value = 100;
    // Continue anyway
  } finally {
    // Always ensure minimum display time and signal ready
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
