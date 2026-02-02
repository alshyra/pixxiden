<template>
  <div class="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden relative flex flex-col">
    <!-- Hero Section (Smart Component) -->
    <GameHeroSection />

    <!-- Main Content -->
    <div class="flex-1 max-w-[1500px] mx-auto px-10 -mt-2 relative z-20 w-full mb-6">
      <div class="grid grid-cols-12 gap-6 h-full items-start">
        <!-- Left Column: Game Info Card (Smart Component) -->
        <div class="col-span-12 lg:col-span-4 space-y-4 h-full flex flex-col">
          <GameInfoCard />
        </div>

        <!-- Right Column: Stats & Synopsis -->
        <div class="col-span-12 lg:col-span-8 space-y-6 h-full flex flex-col">
          <!-- Stats Grid (Smart Component) -->
          <GameStatsGrid />

          <!-- Synopsis -->
          <section class="px-2 overflow-hidden flex-shrink">
            <h3 class="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">
              Synopsis
            </h3>
            <p class="text-xs text-gray-400 leading-snug italic line-clamp-4 opacity-80">
              {{ game?.description || "Missing description" }}
            </p>
          </section>
        </div>
      </div>
    </div>

    <!-- Launch Overlay -->
    <LaunchOverlay :is-visible="isLaunching" :game-title="game?.title || 'Game'" :runner="launchRunner"
      :error="launchError" @close="closeLaunchOverlay" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { onKeyStroke } from "@vueuse/core";
import { useLibraryStore } from "@/stores/library";
import { useGamepad } from "@/composables/useGamepad";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { GameHeroSection, GameInfoCard, GameStatsGrid, LaunchOverlay } from "@/components/game";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";

/**
 * GameDetails - Page détail d'un jeu
 *
 * Architecture "Smart Components":
 * - Les composants enfants (GameHeroSection, GameInfoCard, GameStatsGrid, GameActions)
 *   récupèrent eux-mêmes leurs données via le composable useCurrentGame
 * - Le parent ne fait que l'orchestration (navigation, lifecycle)
 * - Zéro "Props Drilling" : les données ne passent plus par le parent
 */

// === STORE & COMPOSABLES ===
const router = useRouter();
const libraryStore = useLibraryStore();
const { on: onGamepad } = useGamepad();

// useCurrentGame centralise l'accès aux données du jeu courant
const {
  game,
  isLaunching,
  launchError,
  launchRunner,
  playGame,
  closeLaunchOverlay,
  setupEventListeners,
  cleanup,
} = useCurrentGame();

// === INPUT HANDLERS ===
onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => {
  router.back();
});

onKeyStroke(KEYBOARD_SHORTCUTS.CONFIRM, () => {
  if (game.value?.installed) {
    playGame();
  }
});

onGamepad("back", () => router.back());
onGamepad("confirm", () => game.value?.installed && playGame());

// === LIFECYCLE ===
onMounted(async () => {
  await setupEventListeners();

  if (libraryStore.games.length === 0) {
    await libraryStore.fetchGames();
  }
});

onUnmounted(() => {
  cleanup();
});
</script>
