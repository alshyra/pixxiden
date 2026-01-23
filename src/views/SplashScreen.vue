<template>
  <div class="flex flex-col items-center justify-center w-full h-full border border-white/5 bg-[#0a0a0c]">
    
    <PixxidenLogo :glow="true" :is-loading="false" :size="140" />

    <!-- Titre -->
    <h1 class="text-4xl font-black tracking-[0.4em] mb-10 bg-gradient-to-r from-white via-blue-100 to-gray-500 bg-clip-text text-transparent italic">
      PIXXIDEN
    </h1>

    <!-- Statut -->
    <div class="flex flex-col items-center gap-3">
      <p class="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold animate-pulse">
        {{ statusMessage }}
      </p>
      <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Game } from '@/types'
import { PixxidenLogo } from '@/components/ui'

const statusMessage = ref('Initialisation...')
const messages = [
  'Chargement des modules...',
  'Vérification du noyau...',
  'Synchronisation Pixxiden...',
  'Lancement...'
]
let messageIndex = 0
let messageInterval: number | null = null
const MINIMAL_DISPLAY_TIME = 2000 // 3 seconds

onMounted(async () => {
  const startTime = Date.now()
  
  // Animation des messages de statut
  messageInterval = window.setInterval(() => {
    statusMessage.value = messages[messageIndex]
    messageIndex = (messageIndex + 1) % messages.length
  }, 750)
  
  try {
    // Step 1: Check initial setup
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Step 2: Get games to check if initial sync is needed
    const games = await invoke<Game[]>('get_games')
    
    // If no games exist, perform initial sync (but don't block)
    if (games.length === 0) {
      try {
        console.log('🎮 No games found, attempting initial sync...')
        await invoke('sync_games')
      } catch (error) {
        console.warn('🎮 Initial sync failed (may need authentication or stores not configured):', error)
        // Don't block - continue with empty library
      }
    }
  } catch (error) {
    console.error('🎮 Error during splash screen initialization:', error)
    // Continue anyway
  } finally {
    // Always ensure minimum display time and close splash
    const elapsed = Date.now() - startTime
    const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed)
    await new Promise(resolve => setTimeout(resolve, remainingTime))
    
    try {
      console.log('🎮 Closing splash screen')
      await invoke('close_splashscreen')
    } catch (e) {
      console.error('🎮 Failed to close splash screen:', e)
    }
  }
})

onUnmounted(() => {
  if (messageInterval !== null) {
    clearInterval(messageInterval)
  }
})
</script>

<style scoped>
@keyframes dash {
  0% { 
    stroke-dashoffset: 320; 
  }
  50% { 
    stroke-dashoffset: 0; 
  }
  100% { 
    stroke-dashoffset: -320; 
  }
}

.animate-dash {
  animation: dash 4s ease-in-out infinite;
}
</style>
