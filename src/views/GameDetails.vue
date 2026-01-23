<template>
  <div class="game-details min-h-screen bg-black text-white">
    <!-- Background -->
    <div class="absolute inset-0 overflow-hidden">
      <img 
        v-if="game?.backgroundUrl"
        :src="game?.backgroundUrl"
        class="w-full h-full object-cover opacity-50 scale-110"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
    </div>
    
    <!-- Content -->
    <div class="relative z-10 min-h-screen flex">
      <!-- Left Panel: Game Info -->
      <div class="flex-1 p-12 flex flex-col justify-center max-w-3xl">
        <!-- Back Button -->
        <Button 
          variant="ghost"
          size="sm"
          class="mb-8 self-start"
          @click="$router.back()"
        >
          <template #icon>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
            </svg>
          </template>
          Back
        </Button>
        
        <!-- Title -->
        <h1 class="text-5xl font-bold mb-4">{{ game?.title }}</h1>
        
        <!-- Meta -->
        <div class="flex items-center gap-3 mb-6 text-sm">
          <Badge variant="default">PC (Windows)</Badge>
          <Badge v-if="metadata?.releaseDate" variant="default">
            {{ new Date(metadata.releaseDate).getFullYear() }}
          </Badge>
          <Badge v-if="metacriticScore" variant="success">{{ metacriticScore }}</Badge>
        </div>
        
        <!-- Stats -->
        <div class="space-y-3 mb-8">
          <div class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Time Played</span>
            <span class="text-white/80">{{ formattedPlayTime }}</span>
          </div>
          <div v-if="game?.lastPlayed" class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Last Played</span>
            <span class="text-white/80">{{ formattedLastPlayed }}</span>
          </div>
          <div v-if="achievements" class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Achievements</span>
            <span class="text-white/80">{{ achievements }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Completion Status</span>
            <span class="text-white/80">{{ completionStatus }}</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-4 mb-8">
          <Button 
            v-if="game?.installed"
            variant="primary" 
            size="lg"
            class="bg-green-600 hover:bg-green-500"
            @click="playGame"
          >
            <template #icon>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
            </template>
            {{ isPlaying ? 'Running' : 'Play' }}
          </Button>
          
          <Button 
            v-else
            variant="primary" 
            size="lg"
            :disabled="installing"
            @click="installGame"
          >
            <template #icon>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </template>
            Install
          </Button>
          
          <Button variant="ghost" @click="showSettings = true">
            •••
          </Button>
          
          <Button v-if="isPlaying" variant="ghost" @click="returnToGame">
            Return to Game
          </Button>
          
          <Button v-if="isPlaying" variant="ghost" @click="exitGame">
            Exit
          </Button>
        </div>
        
        <!-- Description -->
        <div v-if="metadata?.description" class="text-white/70 text-sm leading-relaxed max-w-xl">
          {{ metadata.description }}
        </div>
      </div>
      
      <!-- Right Panel: Cover Art -->
      <div class="flex-shrink-0 w-80 p-12 flex flex-col items-end justify-end">
        <div class="w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
          <img 
            v-if="game?.backgroundUrl"
            :src="game.backgroundUrl"
            :alt="game.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
            <span class="text-4xl">🎮</span>
          </div>
        </div>
        
        <!-- Genres -->
        <div v-if="metadata?.genres" class="mt-4 text-right text-white/60 text-sm">
          {{ metadata.genres.join(' | ') }}
        </div>
      </div>
    </div>
    
    <!-- Settings Modal -->
    <GameSettingsModal 
      :show="showSettings" 
      :game-id="gameId"
      @close="showSettings = false"
    />
    
    <!-- Launch Overlay -->
    <LaunchOverlay
      :is-visible="isLaunching"
      :game-title="game?.title || 'Game'"
      :runner="launchRunner"
      :error="launchError"
      @close="closeLaunchOverlay"
    />
    
    <!-- Download Overlay -->
    <DownloadOverlay
      :is-visible="isDownloading"
      :game-title="game?.title || 'Game'"
      :runner="launchRunner"
      :error="downloadError"
      :progress="downloadProgress"
      :downloaded="downloadedSize"
      :total="totalSize"
      :speed="downloadSpeed"
      :eta="downloadEta"
      @close="closeDownloadOverlay"
      @cancel="cancelDownload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { Button, Badge } from '@/components/ui'
import GameSettingsModal from '@/components/game/GameSettingsModal.vue'
import LaunchOverlay from '@/components/game/LaunchOverlay.vue'
import DownloadOverlay from '@/components/game/DownloadOverlay.vue'
import type { Metadata } from '@/types'

// Define UnlistenFn type locally to avoid import issues in E2E
type UnlistenFn = () => void

// Safe listen wrapper for E2E compatibility
const safeListen = async (event: string, handler: (event: any) => void): Promise<UnlistenFn> => {
  try {
    const { listen } = await import('@tauri-apps/api/event')
    return listen(event, handler)
  } catch (e) {
    console.warn(`[GameDetails] Failed to setup listener for '${event}' (expected in E2E):`, e)
    return () => {} // Return no-op unlisten function
  }
}

const route = useRoute()
const libraryStore = useLibraryStore()

const gameId = computed(() => route.params.id as string)
const showSettings = ref(false)
const game = computed(() => {
  const g = libraryStore.games.find(g => g.id === gameId.value)
  if (g) {
    console.log('🎮 Game data:', {
      id: g.id,
      title: g.title,
      hasCover: !!g.backgroundUrl,
      hasBackground: !!g.backgroundUrl,
      coverUrl: g.backgroundUrl?.substring(0, 50),
      backgroundUrl: g.backgroundUrl?.substring(0, 50)
    })
  }
  return g
})
const metadata = ref<Metadata | null>(null)
const isPlaying = ref(false)
const installing = ref(false)
const metacriticScore = ref<number | null>(85) // TODO: Get from API

// Launch overlay state
const isLaunching = ref(false)
const launchError = ref<string | null>(null)
const launchRunner = computed(() => {
  if (!game.value) return undefined
  switch (game.value.store) {
    case 'epic': return 'Legendary (Epic Games)'
    case 'gog': return 'GOGdl (GOG Galaxy)'
    case 'amazon': return 'Nile (Amazon Games)'
    default: return game.value.store
  }
})

// Download overlay state
const isDownloading = ref(false)
const downloadError = ref<string | null>(null)
const downloadProgress = ref(0)
const downloadedSize = ref('0 MB')
const totalSize = ref('0 MB')
const downloadSpeed = ref('Calculating...')
const downloadEta = ref('Calculating...')

// Event listeners
let unlistenLaunching: UnlistenFn | undefined
let unlistenLaunched: UnlistenFn | undefined
let unlistenFailed: UnlistenFn | undefined
let unlistenInstalling: UnlistenFn | undefined
let unlistenInstallProgress: UnlistenFn | undefined
let unlistenInstalled: UnlistenFn | undefined
let unlistenInstallFailed: UnlistenFn | undefined

const achievements = computed(() => {
  // TODO: Get from API
  return '17/60 (29%)'
})

const completionStatus = computed(() => {
  if (!game.value?.playTime) return 'Not Played'
  if (game.value.playTime > 3600 * 20) return 'Played'
  return 'Started'
})

const formattedPlayTime = computed(() => {
  const minutes = game.value?.playTime || 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
})

const formattedLastPlayed = computed(() => {
  if (!game.value?.lastPlayed) return 'Never'
  return new Date(game.value.lastPlayed).toLocaleDateString()
})

async function playGame() {
  if (!game.value) return
  
  // Reset state and show overlay
  launchError.value = null
  isLaunching.value = true
  
  try {
    await libraryStore.launchGame(game.value.id)
    // Success will be handled by event listener
  } catch (error: any) {
    launchError.value = error?.message || error?.toString() || 'Unknown error'
    console.error('Failed to launch game:', error)
  }
}

function closeLaunchOverlay() {
  isLaunching.value = false
  launchError.value = null
}

async function installGame() {
  if (!game.value) return
  installing.value = true
  isDownloading.value = true
  downloadProgress.value = 0
  downloadError.value = null
  
  try {
    await libraryStore.installGame(game.value.id)
    // Success will be handled by event listener
  } catch (error: any) {
    downloadError.value = error?.message || error?.toString() || 'Download failed'
    console.error('Failed to install game:', error)
  } finally {
    installing.value = false
  }
}

function closeDownloadOverlay() {
  isDownloading.value = false
  downloadError.value = null
  downloadProgress.value = 0
}

function cancelDownload() {
  // TODO: Implement cancel download via Tauri command
  console.log('Cancel download requested')
  closeDownloadOverlay()
  installing.value = false
}

function returnToGame() {
  // TODO: Focus game window
}

function exitGame() {
  // TODO: Kill game process
  isPlaying.value = false
}

onMounted(async () => {
  // Setup Tauri event listeners with try/catch for E2E test compatibility
  try {
    // Listen to Tauri events - Launch
    unlistenLaunching = await safeListen('game-launching', (event: any) => {
      console.log('🚀 Game launching:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        isLaunching.value = true
        launchError.value = null
      }
    })
    
    unlistenLaunched = await safeListen('game-launched', (event: any) => {
      console.log('✅ Game launched:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        // Small delay before hiding overlay for smoother UX
        setTimeout(() => {
          isLaunching.value = false
          isPlaying.value = true
        }, 500)
      }
    })
    
    unlistenFailed = await safeListen('game-launch-failed', (event: any) => {
      console.log('❌ Game launch failed:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        launchError.value = event.payload?.error || 'Unknown error'
      }
    })
    
    // Listen to Tauri events - Install/Download
    unlistenInstalling = await safeListen('game-installing', (event: any) => {
      console.log('📥 Game installing:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        isDownloading.value = true
        downloadError.value = null
        downloadProgress.value = 0
      }
    })
    
    unlistenInstallProgress = await safeListen('game-install-progress', (event: any) => {
      console.log('📊 Download progress:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = event.payload.progress || 0
        downloadedSize.value = event.payload.downloaded || '0 MB'
        totalSize.value = event.payload.total || '0 MB'
        downloadSpeed.value = event.payload.speed || 'N/A'
        downloadEta.value = event.payload.eta || 'Calculating...'
      }
    })
    
    unlistenInstalled = await safeListen('game-installed', (event: any) => {
      console.log('✅ Game installed:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = 100
        // Refresh game data after install
        setTimeout(async () => {
          isDownloading.value = false
          installing.value = false
          await libraryStore.fetchGames()
        }, 1500)
      }
    })
    
    unlistenInstallFailed = await safeListen('game-install-failed', (event: any) => {
      console.log('❌ Game install failed:', event.payload)
      if (event.payload?.gameId === gameId.value) {
        downloadError.value = event.payload?.error || 'Download failed'
        installing.value = false
      }
    })
  } catch (e) {
    // In E2E tests, Tauri event listeners may fail - this is expected
    console.warn('[GameDetails] Failed to setup Tauri event listeners (expected in E2E tests):', e)
  }
})

onUnmounted(() => {
  unlistenLaunching?.()
  unlistenLaunched?.()
  unlistenFailed?.()
  unlistenInstalling?.()
  unlistenInstallProgress?.()
  unlistenInstalled?.()
  unlistenInstallFailed?.()
})
</script>
