<template>
  <div class="splash-container">
    <div class="splash-content">
      <div class="loader">
        <div class="loader-inner">
          <div class="loader-line-wrap">
            <div class="loader-line"></div>
          </div>
          <div class="loader-line-wrap">
            <div class="loader-line"></div>
          </div>
          <div class="loader-line-wrap">
            <div class="loader-line"></div>
          </div>
          <div class="loader-line-wrap">
            <div class="loader-line"></div>
          </div>
          <div class="loader-line-wrap">
            <div class="loader-line"></div>
          </div>
        </div>
      </div>
      <h1 class="app-title">Pixxiden</h1>
      <p class="loading-text">{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Game } from '@/types'

const loadingMessage = ref('Initializing...')

onMounted(async () => {
  try {
    // Step 1: Check initial setup
    loadingMessage.value = 'Checking game libraries...'
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Step 2: Get games to check if initial sync is needed
    const games = await invoke<Game[]>('get_games')
    
    // If no games exist, perform initial sync
    if (games.length === 0) {
      loadingMessage.value = 'Syncing game libraries...'
      try {
        await invoke('sync_games')
      } catch (error) {
        console.warn('Initial sync failed (may need authentication):', error)
      }
    }
    
    // Step 3: Final preparation
    loadingMessage.value = 'Loading your library...'
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Step 4: Close splash screen and show main window
    await invoke('close_splashscreen')
  } catch (error) {
    console.error('Error during splash screen initialization:', error)
    // Even if there's an error, show the main window after a delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await invoke('close_splashscreen')
    } catch (e) {
      console.error('Failed to close splash screen:', e)
    }
  }
})
</script>

<style scoped>
.splash-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
}

.splash-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.loader {
  height: 80px;
  width: 80px;
  position: relative;
  margin: 0 auto;
}

.loader-inner {
  bottom: 0;
  height: 80px;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  width: 80px;
}

.loader-line-wrap {
  animation: spin 2000ms cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
  box-sizing: border-box;
  height: 50px;
  left: 0;
  overflow: hidden;
  position: absolute;
  top: 0;
  transform-origin: 50% 100%;
  width: 100px;
}

.loader-line {
  border: 4px solid transparent;
  border-radius: 100%;
  box-sizing: border-box;
  height: 100px;
  left: 0;
  margin: 0 auto;
  position: absolute;
  right: 0;
  top: 0;
  width: 100px;
}

.loader-line-wrap:nth-child(1) {
  animation-delay: -50ms;
}

.loader-line-wrap:nth-child(2) {
  animation-delay: -100ms;
}

.loader-line-wrap:nth-child(3) {
  animation-delay: -150ms;
}

.loader-line-wrap:nth-child(4) {
  animation-delay: -200ms;
}

.loader-line-wrap:nth-child(5) {
  animation-delay: -250ms;
}

.loader-line-wrap:nth-child(1) .loader-line {
  border-color: hsl(0, 80%, 60%);
  height: 90px;
  width: 90px;
  top: 7px;
}

.loader-line-wrap:nth-child(2) .loader-line {
  border-color: hsl(60, 80%, 60%);
  height: 76px;
  width: 76px;
  top: 14px;
}

.loader-line-wrap:nth-child(3) .loader-line {
  border-color: hsl(120, 80%, 60%);
  height: 62px;
  width: 62px;
  top: 21px;
}

.loader-line-wrap:nth-child(4) .loader-line {
  border-color: hsl(180, 80%, 60%);
  height: 48px;
  width: 48px;
  top: 28px;
}

.loader-line-wrap:nth-child(5) .loader-line {
  border-color: hsl(240, 80%, 60%);
  height: 34px;
  width: 34px;
  top: 35px;
}

@keyframes spin {
  0%, 15% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

.app-title {
  font-family: 'Poppins', sans-serif;
  font-size: 3rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  letter-spacing: 0.05em;
}

.loading-text {
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
</style>
