<template>
  <div id="app" class="min-h-screen bg-black text-white">
    <SplashScreen v-if="isSplashScreen" @ready="onSplashReady" />
    <template v-if="!isSplashScreen">
      <!-- Setup Wizard (first-run) -->
      <SetupWizard v-if="showSetupWizard" @complete="onSetupComplete" @skip="onSetupSkip" />

      <!-- Main router view -->
      <RouterView />

      <!-- Side Nav (SteamOS-style, triggered by Guide/Start button) -->
      <SideNav @open-power-menu="showPowerModal = true" />

      <!-- Power Modal (shutdown / quit) -->
      <PowerModal :show="showPowerModal" @close="showPowerModal = false" />

      <!-- Global Game Overlay (triggered by gamepad Guide/PS button) -->
      <GameOverlay ref="gameOverlay" />

      <!-- Console Footer (persistent) -->
      <ConsoleFooter v-if="!isSplashScreen && !showSetupWizard" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";
import { GameOverlay } from "@/components/game";
import { ConsoleFooter, SideNav } from "@/components/layout";
import { SetupWizard } from "@/components/ui";
import PowerModal from "@/components/settings/PowerModal.vue";
import { useGamepad } from "@/composables/useGamepad";
import { useSideNavStore } from "@/stores/sideNav";
import { getWindowService } from "@/services";
import * as api from "@/services/api";
import SplashScreen from "./views/SplashScreen.vue";
import { attachConsole } from '@tauri-apps/plugin-log';

attachConsole();

const gamepad = useGamepad();
const sideNavStore = useSideNavStore();
const gameOverlay = ref<InstanceType<typeof GameOverlay> | null>(null);
const showSetupWizard = ref(false);
const showPowerModal = ref(false);
const isSplashScreen = ref(true);

function onSplashReady() {
  isSplashScreen.value = false;
}

// Track if a game is currently running (for PS/Guide button behavior)
const isGameRunning = ref(false);
provide("isGameRunning", isGameRunning);

let unlistenGameLaunched: UnlistenFn | null = null;
let unlistenGameError: UnlistenFn | null = null;
let unlistenGameExited: UnlistenFn | null = null;
let unsubscribeGamepad: Array<() => void> = [];

// Check if setup wizard is needed on mount
onMounted(async () => {
  try {
    const needsSetup = await api.needsSetup();
    showSetupWizard.value = needsSetup;
  } catch (error) {
    await logError(`Failed to check setup status: ${error}`);
    // Don't show wizard on error - user can configure later in settings
  }

  // Listen for game launch events
  try {
    unlistenGameLaunched = await listen("game-launched", (event: any) => {
      debug("Game launched - PS button now controls game overlay");
      isGameRunning.value = true;

      // Notify the GameOverlay about the current game
      if (event.payload?.game) {
        gameOverlay.value?.setCurrentGame(event.payload.game);
      }
    });

    unlistenGameError = await listen("game-launch-error", () => {
      debug("Game launch failed - resetting game state");
      isGameRunning.value = false;
      gameOverlay.value?.setCurrentGame(null);
    });

    unlistenGameExited = await listen("game-exited", () => {
      debug("Game exited - cleaning up overlay");
      isGameRunning.value = false;
      gameOverlay.value?.setCurrentGame(null);
    });
  } catch (e) {
    await warn(`Failed to setup game event listeners: ${e}`);
  }

  // Handle PS/Guide button: toggle SideNav (or bring Pixxiden to front during gameplay)
  unsubscribeGamepad.push(
    gamepad.on("guide", async () => {
      if (isSplashScreen.value || showSetupWizard.value) return;

      if (isGameRunning.value && !sideNavStore.isOpen) {
        // When game is running: bring Pixxiden to foreground and show overlay
        const windowService = getWindowService();
        await windowService.focusMainWindow();
        gameOverlay.value?.toggle();
      } else {
        // Toggle SideNav (SteamOS-style)
        sideNavStore.toggle();
      }
    }),
  );

  // Start button also toggles SideNav (fallback for controllers without Guide)
  unsubscribeGamepad.push(
    gamepad.on("start", () => {
      if (isSplashScreen.value || showSetupWizard.value) return;
      sideNavStore.toggle();
    }),
  );
});

onUnmounted(() => {
  unlistenGameLaunched?.();
  unlistenGameError?.();
  unlistenGameExited?.();
  // Cleanup gamepad listeners
  unsubscribeGamepad.forEach((unsub) => unsub());
});

function onSetupComplete() {
  showSetupWizard.value = false;
}

function onSetupSkip() {
  showSetupWizard.value = false;
}

// Provide overlay control to child components
provide("gameOverlay", gameOverlay);
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap");

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #000;
  color: #fff;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Transition: Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Transition: Slide up */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Padding bottom to account for console footer */
.has-footer {
  padding-bottom: 64px;
}
</style>
