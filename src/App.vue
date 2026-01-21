<template>
  <div id="app" class="min-h-screen bg-black text-white">
    <router-view />
    
    <!-- Global Game Overlay (triggered by gamepad Guide/PS button) -->
    <GameOverlay ref="gameOverlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import { GameOverlay } from '@/components/game'

const gameOverlay = ref<InstanceType<typeof GameOverlay> | null>(null)

// Provide overlay control to child components
provide('gameOverlay', gameOverlay)
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
</style>

