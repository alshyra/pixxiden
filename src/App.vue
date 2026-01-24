<template>
  <div id="app" class="min-h-screen bg-black text-white">
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
    <ConsoleFooter v-if="!isSplashScreen" />
    
    <!-- Global Game Overlay (triggered by gamepad Guide/PS button) -->
    <GameOverlay ref="gameOverlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { GameOverlay } from '@/components/game'
import { ConsoleFooter } from '@/components/layout'

const route = useRoute()
const gameOverlay = ref<InstanceType<typeof GameOverlay> | null>(null)

// Provide overlay control to child components
provide('gameOverlay', gameOverlay)

// Check if we're on splash screen (hide footer)
const isSplashScreen = computed(() => {
  return route.path === '/splash' || route.name === 'splash'
})

// Check if settings overlay is open
const isSettingsOpen = computed(() => {
  return route.name === 'settings'
})

// Provide settings state for child components
provide('isSettingsOpen', isSettingsOpen)

// Get the appropriate transition name based on route
function getTransitionName(targetRoute: typeof route): string {
  // Settings opens as overlay
  if (targetRoute.name === 'settings') {
    return 'settings-overlay'
  }
  // Default fade for other views
  return 'fade'
}

function onEnter(el: Element) {
  // Animation entry callback if needed
}

function onLeave(el: Element, done: () => void) {
  // Animation leave callback if needed
  done()
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, sans-serif;
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

