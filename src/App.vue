<template>
  <div id="app" class="min-h-screen bg-black text-white" >
    <SplashScreen v-if="isSplashScreen" />
    <template v-if="!isSplashScreen">
      <!-- Setup Wizard (first-run) -->
      <SetupWizard v-if="showSetupWizard" @complete="onSetupComplete" @skip="onSetupSkip" />
  
      <!-- Main router view - no transitions for E2E compatibility -->
      <router-view v-slot="{ Component, route }">
        <component
          v-if="Component"
          :is="Component"
          :key="route.path"
          :class="{ 'view-blurred': isSettingsOpen && route.name !== 'settings' }"
        />
      </router-view>
  
      <!-- Console Footer (persistent) -->
      <ConsoleFooter v-if="!isSplashScreen && !showSetupWizard" />
  
      <!-- Global Game Overlay (triggered by gamepad Guide/PS button) -->
      <GameOverlay ref="gameOverlay" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { GameOverlay } from "@/components/game";
import { ConsoleFooter } from "@/components/layout";
import { SetupWizard } from "@/components/ui";
import { useGamepad } from "@/composables/useGamepad";
import * as api from "@/services/api";
import SplashScreen from "./views/SplashScreen.vue";

const route = useRoute();
const router = useRouter();
const gamepad = useGamepad();
const gameOverlay = ref<InstanceType<typeof GameOverlay> | null>(null);
const showSetupWizard = ref(false);
const isSplashScreen = ref(true)

setTimeout(() => {
  isSplashScreen.value = false;
}, 3000);

// Track if a game is currently running (for PS/Guide button behavior)
const isGameRunning = ref(false);
provide("isGameRunning", isGameRunning);

let unlistenGameLaunched: UnlistenFn | null = null;
let unlistenGameError: UnlistenFn | null = null;

// Check if setup wizard is needed on mount
onMounted(async () => {
  try {
    const needsSetup = await api.needsSetup();
    showSetupWizard.value = needsSetup;
  } catch (error) {
    console.error("Failed to check setup status:", error);
    // Don't show wizard on error - user can configure later in settings
  }

  // Listen for game launch events
  try {
    unlistenGameLaunched = await listen("game-launched", () => {
      console.log("🎮 Game launched - PS button now controls game overlay");
      isGameRunning.value = true;
    });

    unlistenGameError = await listen("game-launch-error", () => {
      console.log("🎮 Game launch failed - resetting game state");
      isGameRunning.value = false;
    });
  } catch (e) {
    console.warn("Failed to setup game event listeners:", e);
  }

  // Handle PS/Guide button: toggle settings when no game is running
  gamepad.on("guide", () => {
    if (isSplashScreen.value || showSetupWizard.value) return;

    if (isGameRunning.value) {
      // When game is running, toggle game overlay
      gameOverlay.value?.toggle();
    } else {
      // When no game is running, toggle settings
      if (route.name === "settings") {
        router.back();
      } else {
        router.push("/settings");
      }
    }
  });
});

onUnmounted(() => {
  unlistenGameLaunched?.();
  unlistenGameError?.();
});

function onSetupComplete() {
  showSetupWizard.value = false;
}

function onSetupSkip() {
  showSetupWizard.value = false;
}

// Provide overlay control to child components
provide("gameOverlay", gameOverlay);

// Check if we're on splash screen (hide footer)

// Check if settings overlay is open
const isSettingsOpen = computed(() => route.name === "settings");

// Provide settings state for child components
provide("isSettingsOpen", isSettingsOpen);
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

/* View blurred effect when settings overlay is open */
.view-blurred {
  opacity: 0.3;
  transform: scale(0.92) translateZ(0);
  filter: grayscale(0.8) blur(8px);
  pointer-events: none;
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Transition: Settings Overlay */
.settings-overlay-enter-active,
.settings-overlay-leave-active {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.settings-overlay-enter-from {
  opacity: 0;
  transform: scale(1.05) translateZ(0);
  filter: blur(15px);
}

.settings-overlay-leave-to {
  opacity: 0;
  transform: scale(1.05) translateZ(0);
  filter: blur(15px);
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
