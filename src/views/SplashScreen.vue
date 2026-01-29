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
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Game } from "@/types";
import { PixxidenLogo } from "@/components/ui";
import { useRouter } from "vue-router";

const router = useRouter();
const statusMessage = ref("Initialisation...");
const currentGame = ref("");
const progress = ref(0);
const MINIMAL_DISPLAY_TIME = 3000; // 3 seconds minimum

let unlistenProgress: UnlistenFn | null = null;

// Progress event payload from backend
interface SplashProgressEvent {
  store: string;
  gameTitle: string;
  current: number;
  total: number;
  message: string;
}

onMounted(async () => {
  const startTime = Date.now();

  // Listen for progress events from backend
  try {
    unlistenProgress = await listen<SplashProgressEvent>("splash-progress", (event) => {
      console.log("📊 Splash progress:", event.payload);
      const { store, gameTitle, current, total, message } = event.payload;

      statusMessage.value = message || `Syncing ${store}...`;
      currentGame.value = gameTitle || "";

      // Calculate progress: base 40% for pre-sync, then 40-90% during sync
      if (total > 0) {
        const syncProgress = (current / total) * 50; // 50% of total progress for sync
        progress.value = Math.min(40 + syncProgress, 90);
      }
    });
  } catch (e) {
    console.warn("Failed to setup splash progress listener:", e);
  }

  try {
    // Step 1: Check initial setup
    statusMessage.value = "Chargement des modules...";
    progress.value = 10;
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Step 2: Check stores
    statusMessage.value = "Détection des stores...";
    progress.value = 25;
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Step 3: Get games to check if initial sync is needed
    statusMessage.value = "Chargement de la bibliothèque...";
    progress.value = 40;
    const games = await invoke<Game[]>("get_games");

    // If no games exist, perform initial sync (but don't block)
    if (games.length === 0) {
      try {
        console.log("🎮 No games found, attempting initial sync...");
        statusMessage.value = "Synchronisation des jeux...";
        // Progress will be updated via events
        await invoke("sync_games");
      } catch (error) {
        console.warn(
          "🎮 Initial sync failed (may need authentication or stores not configured):",
          error,
        );
        // Don't block - continue with empty library
      }
    } else {
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
    // Always ensure minimum display time and close splash
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed);
    await new Promise((resolve) => setTimeout(resolve, remainingTime));
    router.replace({ name: "Library" });
  }
});

onUnmounted(() => {
  unlistenProgress?.();
});
</script>

