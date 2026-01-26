<template>
  <div class="fixed inset-0 flex items-center justify-center bg-transparent">
    <!-- Overlay Content -->
    <div
      class="bg-gray-900/95 rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 border border-white/10 backdrop-blur-xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <img
            v-if="currentGame?.backgroundUrl"
            :src="currentGame.backgroundUrl"
            class="w-16 h-16 rounded-lg object-cover"
          />
          <div v-else class="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center">
            <span class="text-2xl">🎮</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">
              {{ currentGame?.title || "Game" }}
            </h2>
            <p class="text-sm text-white/60">Playing for {{ formatPlayTime(sessionTime) }}</p>
          </div>
        </div>

        <Button variant="ghost" icon-only @click="closeOverlay">
          <template #icon>
            <X class="w-6 h-6" />
          </template>
        </Button>
      </div>

      <!-- Actions Grid -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <!-- Resume Game -->
        <OverlayActionCard
          ref="resumeButton"
          variant="success"
          title="Resume Game"
          subtitle="Press B or Guide"
          @click="resumeGame"
        >
          <template #icon>
            <Play class="w-8 h-8" />
          </template>
        </OverlayActionCard>

        <!-- Achievements (placeholder) -->
        <OverlayActionCard
          variant="ghost"
          title="Achievements"
          subtitle="Bientôt"
          class="!bg-gray-800 hover:!bg-gray-700"
          @click="showAchievements"
        >
          <template #icon>
            <Trophy class="w-8 h-8 text-yellow-500" />
          </template>
        </OverlayActionCard>

        <!-- Screenshot (placeholder) -->
        <OverlayActionCard
          variant="ghost"
          title="Screenshot"
          subtitle="Bientôt"
          class="!bg-gray-800 hover:!bg-gray-700"
          @click="takeScreenshot"
        >
          <template #icon>
            <Camera class="w-8 h-8 text-blue-400" />
          </template>
        </OverlayActionCard>

        <!-- Quit Game -->
        <OverlayActionCard variant="danger" title="Quit Game" @click="quitGame">
          <template #icon>
            <XCircle class="w-8 h-8" />
          </template>
        </OverlayActionCard>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-400">
            {{ sessionTime > 0 ? Math.round(sessionTime / 60) : "—" }}
          </p>
          <p class="text-xs text-white/60">Session (min)</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-white">{{ totalPlayTime }}</p>
          <p class="text-xs text-white/60">Total Time</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-yellow-400">{{ achievements }}</p>
          <p class="text-xs text-white/60">Achievements</p>
        </div>
      </div>

      <!-- Hint -->
      <p class="text-center text-white/40 text-sm mt-4">
        Press <kbd class="px-2 py-1 bg-gray-800 rounded text-white/60">Guide</kbd> or
        <kbd class="px-2 py-1 bg-gray-800 rounded text-white/60">B</kbd> to return to game
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui";
import { OverlayActionCard } from "@/components/game";
import { X, Play, Trophy, Camera, XCircle } from "lucide-vue-next";
import type { Game } from "@/types";

const currentGame = ref<Game | null>(null);
const sessionTime = ref(0); // seconds
const sessionStartTime = ref<number | null>(null);
const resumeButton = ref<HTMLButtonElement | null>(null);

let sessionInterval: ReturnType<typeof setInterval> | undefined;
let unlistenGameData: UnlistenFn | undefined;

const totalPlayTime = computed(() => {
  if (!currentGame.value?.playTimeMinutes) return "N/A";
  const minutes = currentGame.value.playTimeMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  return hours > 0 ? `${hours}h` : `${mins}m`;
});

const achievements = computed(() => {
  if (currentGame.value?.achievementsUnlocked !== undefined) {
    return String(currentGame.value.achievementsUnlocked);
  }
  return "N/A";
});

function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function closeOverlay() {
  const window = getCurrentWindow();
  await window.hide();
}

async function resumeGame() {
  await closeOverlay();
}

function showAchievements() {
  console.log("Show achievements");
}

function takeScreenshot() {
  console.log("Take screenshot");
}

async function quitGame() {
  // TODO: Confirm dialog
  console.log("Quit game");
  await closeOverlay();
}

onMounted(async () => {
  // Listen for game data updates
  unlistenGameData = await listen<{ game: Game; startTime: number }>(
    "overlay-game-data",
    (event) => {
      currentGame.value = event.payload.game;
      sessionStartTime.value = event.payload.startTime;
      sessionTime.value = Math.floor((Date.now() - event.payload.startTime) / 1000);

      // Start session timer
      if (sessionInterval) clearInterval(sessionInterval);
      sessionInterval = setInterval(() => {
        if (sessionStartTime.value) {
          sessionTime.value = Math.floor((Date.now() - sessionStartTime.value) / 1000);
        }
      }, 1000);
    },
  );

  // Focus resume button
  nextTick(() => {
    resumeButton.value?.focus();
  });
});

onUnmounted(() => {
  unlistenGameData?.();
  if (sessionInterval) clearInterval(sessionInterval);
});
</script>

<style scoped>
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
