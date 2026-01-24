<template>
  <div class="game-details min-h-screen bg-black text-white overflow-hidden">
    <!-- Hero Background with Parallax Effect -->
    <div class="absolute inset-0">
      <img 
        v-if="game?.backgroundUrl"
        :src="game?.backgroundUrl"
        :alt="game?.title"
        class="w-full h-full object-cover blur-sm scale-110 opacity-40"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
    </div>
    
    <!-- Content Container -->
    <div class="relative z-10 min-h-screen">
      <!-- Back Button -->
      <div class="p-8">
        <Button 
          variant="ghost"
          size="sm"
          class="hover:bg-white/10"
          @click="$router.back()"
        >
          <template #icon>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
            </svg>
          </template>
          Back to Library
        </Button>
      </div>

      <!-- Main Content Grid -->
      <div class="container mx-auto px-8 pb-12">
        <div class="flex gap-12 items-start">
          <!-- Left Section: Cover Art -->
          <div class="flex-shrink-0">
            <div class="w-80 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover:ring-white/20 transition-all duration-300 hover:scale-105">
              <img 
                v-if="game?.backgroundUrl"
                :src="game.backgroundUrl"
                :alt="game?.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <svg class="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
          
          <!-- Right Section: Game Info -->
          <div class="flex-1 space-y-8">
            <!-- Title & Meta -->
            <div>
              <h1 class="text-6xl font-black mb-4 tracking-tight uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {{ game?.title || 'Loading...' }}
              </h1>
              
              <div class="flex items-center gap-3 mb-4">
                <span class="text-lg text-gray-400">{{ game?.developer || 'Unknown Developer' }}</span>
                <span class="text-gray-600">•</span>
                <span class="text-lg text-gray-400">{{ getReleaseYear }}</span>
              </div>
              
              <!-- Tags/Genres -->
              <div class="flex flex-wrap gap-2 mb-4">
                <Badge 
                  v-for="genre in displayGenres" 
                  :key="genre"
                  variant="outline"
                  class="px-3 py-1 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors"
                >
                  {{ genre }}
                </Badge>
                <Badge 
                  v-if="metacriticScore"
                  variant="success"
                  class="px-3 py-1 bg-green-500/20 text-green-400 font-bold"
                >
                  {{ metacriticScore }}
                </Badge>
              </div>
            </div>

            <!-- Rich Stats Grid -->
            <div class="grid grid-cols-4 gap-4">
              <div class="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Playtime</div>
                <div class="text-2xl font-bold text-white">{{ formattedPlayTime }}</div>
              </div>
              
              <div class="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Played</div>
                <div class="text-2xl font-bold text-white">{{ formattedLastPlayed }}</div>
              </div>
              
              <div class="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Achievements</div>
                <div class="text-2xl font-bold text-white">{{ achievementPercentage }}%</div>
              </div>
              
              <div class="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</div>
                <div class="text-2xl font-bold text-white">{{ completionStatus }}</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-4">
              <Button 
                v-if="game?.installed"
                variant="primary" 
                size="lg"
                class="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold px-8 py-4 text-lg shadow-lg hover:shadow-green-500/50 transition-all"
                @click="playGame"
              >
                <template #icon>
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                  </svg>
                </template>
                {{ isPlaying ? 'Running' : 'Play Now' }}
              </Button>
              
              <Button 
                v-else
                variant="primary" 
                size="lg"
                class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold px-8 py-4 text-lg shadow-lg hover:shadow-blue-500/50 transition-all"
                @click="showInstallModal = true"
              >
                <template #icon>
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </template>
                Install Game
              </Button>
              
              <Button 
                variant="ghost" 
                size="lg"
                class="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                @click="showSettings = true"
              >
                <template #icon>
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </template>
                Settings
              </Button>
            </div>
            
            <!-- Description -->
            <div class="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 class="text-lg font-bold mb-3 text-white/90">About this game</h3>
              <p class="text-white/70 leading-relaxed">
                {{ game?.description || metadata?.description || 'Forge your own path in this epic adventure! A masterfully crafted game with emphasis on skill and exploration. Fight fearsome creatures, avoid intricate traps, and solve ancient mysteries in a beautifully hand-drawn world.' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Settings Modal -->
    <GameSettingsModal 
      :show="showSettings" 
      :game-id="gameId"
      @close="showSettings = false"
    />
    
    <!-- Install Modal -->
    <InstallModal
      v-if="game"
      v-model="showInstallModal"
      :game="game"
      @install-started="handleInstallStarted"
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
import InstallModal from '@/components/game/InstallModal.vue'
import type { InstallConfig } from '@/components/game/InstallModal.vue'
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

const showInstallModal = ref(false)
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

// Display genres from metadata or default genres
const displayGenres = computed(() => {
  if (metadata.value?.genres && metadata.value.genres.length > 0) {
    return metadata.value.genres.slice(0, 5)
  }
  // Default genres for demo
  return ['Action', 'Adventure', 'Indie']
})

// Release year from metadata
const getReleaseYear = computed(() => {
  if (metadata.value?.releaseDate) {
    return new Date(metadata.value.releaseDate).getFullYear()
  }
  return '2017' // Default year
})

// Achievement percentage (mock data for now)
const achievementPercentage = computed(() => {
  // TODO: Get from API
  return 58
})

const completionStatus = computed(() => {
  const minutes = game.value?.playTime || 0
  if (minutes === 0) return 'Not Played'
  if (minutes > 3600) return 'Completed' // More than 60 hours
  if (minutes > 1200) return 'Playing' // More than 20 hours
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

function handleInstallStarted(config: InstallConfig) {
  console.log('Installation started with config:', config)
  installing.value = true
  isDownloading.value = true
  downloadProgress.value = 0
  downloadError.value = null
  
  // The actual installation is triggered by the InstallModal
  // Events will be handled by the existing event listeners
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
