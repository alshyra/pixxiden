<template>
  <!-- This component no longer renders UI, it manages the overlay window -->
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen, emit, type UnlistenFn } from "@tauri-apps/api/event";
import type { Game } from "@/types";

const currentGame = ref<Game | null>(null);
const sessionStartTime = ref<number | null>(null);
let overlayWindow: WebviewWindow | null = null;
let unlistenToggle: UnlistenFn | undefined;

async function createOverlayWindow() {
  // Only create if it doesn't exist
  if (overlayWindow) return;

  try {
    overlayWindow = new WebviewWindow("game-overlay", {
      url: "/overlay",
      title: "Game Overlay",
      width: 1920,
      height: 1080,
      fullscreen: true,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      visible: false, // Start hidden
      focus: false,
    });

    console.log("🎮 Game overlay window created");
  } catch (error) {
    console.error("Failed to create overlay window:", error);
  }
}

async function showOverlay() {
  if (!overlayWindow) {
    await createOverlayWindow();
  }

  // Send current game data to overlay
  if (currentGame.value && sessionStartTime.value) {
    await emit("overlay-game-data", {
      game: currentGame.value,
      startTime: sessionStartTime.value,
    });
  }

  await overlayWindow?.show();
  await overlayWindow?.setFocus();
}

async function hideOverlay() {
  await overlayWindow?.hide();
}

async function toggleOverlay() {
  const isVisible = await overlayWindow?.isVisible();
  if (isVisible) {
    await hideOverlay();
  } else {
    await showOverlay();
  }
}

async function destroyOverlay() {
  try {
    await overlayWindow?.close();
    overlayWindow = null;
  } catch (error) {
    console.error("Failed to close overlay window:", error);
  }
}

// Set the current playing game (called from parent)
function setCurrentGame(game: Game | null) {
  currentGame.value = game;
  if (game) {
    sessionStartTime.value = Date.now();
    createOverlayWindow();
  } else {
    destroyOverlay();
    sessionStartTime.value = null;
  }
}

// Expose methods for parent component (App.vue)
defineExpose({
  setCurrentGame,
  show: showOverlay,
  hide: hideOverlay,
  toggle: toggleOverlay,
});

onMounted(async () => {
  // Listen for overlay toggle from gamepad
  unlistenToggle = await listen("gamepad-overlay-toggle", () => {
    console.log("🎮 Overlay toggle received");
    toggleOverlay();
  });
});

onUnmounted(() => {
  unlistenToggle?.();
  destroyOverlay();
});
</script>
