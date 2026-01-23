<template>
  <div class="flex flex-col items-center justify-center w-full h-full border border-white/5 bg-[#0a0a0c]">
    
    <!-- Zone du Logo -->
    <div class="relative mb-12 mt-24">
      <!-- Glow Effect -->
      <div class="absolute inset-0 bg-blue-600 blur-[60px] opacity-25 animate-pulse"></div>
      
      <svg width="140" height="140" viewBox="0 0 100 100" class="relative z-10">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
        </defs>
        
        <!-- Hexagone Animé -->
        <path 
          d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
          fill="none" 
          stroke="url(#logo-grad)" 
          stroke-width="3"
          class="animate-dash"
          stroke-dasharray="320"
          stroke-dashoffset="320"
        />
        
        <text x="50" y="62" text-anchor="middle" font-size="30" font-weight="900" fill="white" font-family="monospace">
          PX
        </text>
      </svg>
    </div>

    <!-- Titre -->
    <h1 class="text-4xl font-black tracking-[0.4em] mb-10 bg-gradient-to-r from-white via-blue-100 to-gray-500 bg-clip-text text-transparent italic">
      PIXXIDEN
    </h1>

    <!-- Loader -->
    <div class="relative w-12 h-12 mb-8">
      <div class="absolute inset-0 border-[3px] border-white/5 rounded-full"></div>
      <div class="absolute inset-0 border-[3px] border-transparent border-t-blue-500 rounded-full animate-spin"></div>
      <div class="absolute inset-2 border-[2px] border-transparent border-b-purple-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse] opacity-60"></div>
    </div>

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
    
    // If no games exist, perform initial sync
    if (games.length === 0) {
      try {
        await invoke('sync_games')
      } catch (error) {
        console.warn('Initial sync failed (may need authentication):', error)
      }
    }
    
    // Ensure minimum 3 seconds display
    const elapsed = Date.now() - startTime
    const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed)
    await new Promise(resolve => setTimeout(resolve, remainingTime))
    
    // Close splash screen
    await invoke('close_splashscreen')
  } catch (error) {
    console.error('Error during splash screen initialization:', error)
    
    // Ensure minimum 3 seconds even on error
    const elapsed = Date.now() - startTime
    const remainingTime = Math.max(0, MINIMAL_DISPLAY_TIME - elapsed)
    await new Promise(resolve => setTimeout(resolve, remainingTime))
    
    try {
      await invoke('close_splashscreen')
    } catch (e) {
      console.error('Failed to close splash screen:', e)
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
