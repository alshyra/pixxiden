<template>
  <div class="game-details-hybrid fixed inset-0 bg-black text-white overflow-hidden">
    <!-- Full Background Image -->
    <div class="absolute inset-0">
      <img 
        v-if="game?.backgroundUrl"
        :src="game?.backgroundUrl"
        :alt="game?.title"
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-black/30" />
    </div>
    
    <!-- Main Content -->
    <div class="relative z-10 h-screen flex flex-col">
      <!-- Top Section -->
      <div class="flex-1 flex items-center">
        <div class="w-full max-w-[1920px] mx-auto px-8 flex items-center justify-between gap-6">
          <!-- Left Sidebar Panel -->
          <div class="w-[340px] flex-shrink-0 bg-black/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <!-- Game Cover -->
            <div class="mb-5">
              <img 
                v-if="game?.backgroundUrl"
                :src="game?.backgroundUrl"
                :alt="game?.title"
                class="w-full aspect-square object-cover rounded-xl"
              />
            </div>
            
            <!-- Game Title & Meta -->
            <div class="mb-3">
              <h2 class="text-xl font-black italic mb-1">{{ game?.title || 'HOLLOW KNIGHT' }}</h2>
              <div class="text-xs text-white/60 mb-2">{{ game?.developer || 'TEAM CHERRY' }} • {{ getReleaseYear }}</div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">{{ metacriticScore || '93' }}</span>
                <span class="px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">INDÉ</span>
              </div>
            </div>
            
            <!-- Install / Play Button -->
            <button
              v-if="!game?.installed"
              @click="showInstallModal = true"
              class="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg mb-3 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              INSTALLER
            </button>
            
            <button
              v-else-if="!isDownloading"
              @click="playGame"
              class="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg mb-3 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
              LANCER LE JEU
            </button>
            
            <!-- Download Progress (when downloading) -->
            <div v-if="isDownloading" class="mb-3">
              <div class="flex justify-between text-xs mb-2 text-purple-400 font-bold">
                <span>TÉLÉCHARGEMENT...</span>
                <span>{{ downloadProgress.toFixed(0) }}%</span>
              </div>
              <div class="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  class="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300"
                  :style="{ width: `${downloadProgress}%` }"
                ></div>
              </div>
              <div class="text-xs text-white/60">
                {{ downloadedSize }} / {{ totalSize }}
              </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-2 mb-3 text-center">
              <div>
                <div class="text-[10px] text-white/40 uppercase mb-1">Temps</div>
                <div class="text-sm font-bold">{{ formattedPlayTime }}</div>
              </div>
              <div>
                <div class="text-[10px] text-white/40 uppercase mb-1">Dernier</div>
                <div class="text-sm font-bold">{{ formattedLastPlayed }}</div>
              </div>
              <div>
                <div class="text-[10px] text-white/40 uppercase mb-1">Statut</div>
                <div class="text-sm font-bold text-orange-400">{{ completionStatus }}</div>
              </div>
            </div>
            
            <!-- Achievements Progress -->
            <div>
              <div class="flex justify-between text-xs mb-2">
                <span class="text-purple-400 font-bold uppercase">Succès</span>
                <span class="text-white/80">{{ achievementEarned }}/{{ achievementTotal }}</span>
              </div>
              <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                  :style="{ width: `${achievementPercentage}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Center: Large Title -->
          <div class="flex-1 flex items-center justify-center px-8">
            <h1 class="text-[140px] font-black italic text-white leading-none text-center tracking-tight">
              {{ (game?.title || 'HOLLOW KNIGHT').toUpperCase() }}
            </h1>
          </div>
          
          <!-- Right: Gameplay Video/Image -->
          <div class="w-[800px] flex-shrink-0 aspect-video bg-black/50 rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center">
            <img 
              v-if="game?.backgroundUrl"
              :src="game?.backgroundUrl"
              :alt="game?.title"
              class="w-full h-full object-cover"
            />
            <button class="absolute z-20 w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors">
              <svg class="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Bottom Stats Bar -->
      <div class="bg-black/90 backdrop-blur-sm border-t border-white/10">
        <div class="max-w-[1920px] mx-auto px-8 py-5">
          <!-- Synopsis -->
          <div class="mb-3">
            <h3 class="text-[10px] text-purple-400 uppercase font-bold mb-2 tracking-wider">Synopsis</h3>
            <p class="text-xs text-white/70 leading-relaxed max-w-[500px]">
              {{ game?.description || metadata?.description || 'Forgez votre propre chemin dans Hollow Knight ! Un jeu d\'action en 2D mettant l\'accent sur l\'adresse et l\'exploration. Affrontez une multitude de créatures mortelles, évitez des pièges complexes et résolvez d\'anciens mystères...' }}
            </p>
          </div>
          
          <!-- Bottom Stats Grid -->
          <div class="flex gap-12 max-w-[800px]">
            <div>
              <div class="text-[10px] text-purple-400 uppercase font-bold mb-1 tracking-wider">Histoire</div>
              <div class="text-2xl font-bold text-cyan-400">{{ historyTime }}</div>
            </div>
            <div>
              <div class="text-[10px] text-purple-400 uppercase font-bold mb-1 tracking-wider">Taux</div>
              <div class="text-2xl font-bold text-pink-400">{{ rateTime }}</div>
            </div>
            <div>
              <div class="text-[10px] text-purple-400 uppercase font-bold mb-1 tracking-wider">Vitesse</div>
              <div class="text-2xl font-bold text-green-400">{{ speedValue }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Install Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div 
          v-if="showInstallModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          @click.self="showInstallModal = false"
        >
          <div class="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 max-w-2xl w-full mx-4 border border-purple-500/30">
            <!-- Modal Header -->
            <div class="mb-6">
              <div class="text-xs text-purple-400 uppercase font-bold mb-2">Configuration Système</div>
              <h2 class="text-3xl font-black italic">INSTALLER {{ (game?.title || 'HOLLOW KNIGHT').toUpperCase() }}</h2>
            </div>
            
            <!-- Install Path -->
            <div class="mb-6">
              <label class="block text-xs text-white/60 uppercase font-bold mb-2">Chemin d'accès</label>
              <input 
                v-model="installPath"
                type="text"
                class="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="/home/user/Games/Pixxiden"
              />
            </div>
            
            <!-- Proton Version & Disk Space -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-xs text-white/60 uppercase font-bold mb-2">Version Proton</label>
                <select 
                  v-model="selectedRunner"
                  class="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="proton-experimental">Proton Experimental</option>
                  <option value="ge-proton-8-32">GE-Proton 8-32</option>
                  <option value="wine-ge">Wine-GE</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/60 uppercase font-bold mb-2">Espace Disque</label>
                <div class="px-4 py-3 bg-black/60 border border-white/20 rounded-xl">
                  <div class="text-green-400 font-bold">{{ diskSpace }}</div>
                  <div class="text-xs text-white/50">Requis</div>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-4">
              <button 
                @click="showInstallModal = false"
                class="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
              >
                Annuler
              </button>
              <button 
                @click="handleStartInstallation"
                class="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-colors"
              >
                Démarrer l'installation
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import GameSettingsModal from '@/components/game/GameSettingsModal.vue'
import LaunchOverlay from '@/components/game/LaunchOverlay.vue'
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
const showSettings = ref(false)
const gameId = computed(() => route.params.id as string)
const game = computed(() => libraryStore.games.find(g => g.id === gameId.value))
const metadata = ref<Metadata | null>(null)
const isPlaying = ref(false)
const metacriticScore = ref<number | null>(93)

// Installation state
const installPath = ref('/home/user/Games/Pixxiden')
const selectedRunner = ref('proton-experimental')
const diskSpace = ref('9.2 GO')

// Download state
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedSize = ref('0 MB')
const totalSize = ref('0 MB')
const downloadSpeed = ref('0 MB/s')

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

// Event listeners
let unlistenInstalling: UnlistenFn | undefined
let unlistenInstallProgress: UnlistenFn | undefined
let unlistenInstalled: UnlistenFn | undefined
let unlistenInstallFailed: UnlistenFn | undefined

// Computed values
const getReleaseYear = computed(() => {
  if (metadata.value?.releaseDate) {
    return new Date(metadata.value.releaseDate).getFullYear()
  }
  return '2017'
})

const formattedPlayTime = computed(() => {
  const minutes = game.value?.playTime || 0
  if (minutes === 0) return '0h 0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
})

const formattedLastPlayed = computed(() => {
  if (!game.value?.lastPlayed) return 'Jamais'
  const date = new Date(game.value.lastPlayed)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
})

const completionStatus = computed(() => {
  const minutes = game.value?.playTime || 0
  if (minutes === 0) return 'Non joué'
  if (minutes > 3600) return 'Terminé'
  if (minutes > 1200) return 'En cours'
  return 'Commencé'
})

// Achievement data (TODO: Fetch from API when available)
const achievementEarned = ref(37)
const achievementTotal = ref(63)
const achievementPercentage = computed(() => {
  if (achievementTotal.value === 0) return 0
  return Math.round((achievementEarned.value / achievementTotal.value) * 100)
})

// Bottom stats (using computed values from game data where possible)
const historyTime = computed(() => formattedPlayTime.value)
const rateTime = computed(() => {
  // TODO: Calculate from HowLongToBeat or similar API
  return '63.5h'
})
const speedValue = computed(() => {
  // Show download speed when downloading, otherwise default
  return isDownloading.value ? downloadSpeed.value : '45 MB/s'
})

async function playGame() {
  if (!game.value) return
  
  launchError.value = null
  isLaunching.value = true
  
  try {
    await libraryStore.launchGame(game.value.id)
  } catch (error: any) {
    launchError.value = error?.message || error?.toString() || 'Unknown error'
    console.error('Failed to launch game:', error)
  }
}

function closeLaunchOverlay() {
  isLaunching.value = false
  launchError.value = null
}

async function handleStartInstallation() {
  showInstallModal.value = false
  isDownloading.value = true
  downloadProgress.value = 0
  downloadedSize.value = '0 MB'
  totalSize.value = '0 GB'
  
  // Start actual installation via library store
  if (game.value) {
    try {
      await libraryStore.installGame(game.value.id)
    } catch (error) {
      console.error('Failed to start installation:', error)
      isDownloading.value = false
    }
  }
}

onMounted(async () => {
  try {
    // Listen to install events
    unlistenInstalling = await safeListen('game-installing', (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        isDownloading.value = true
        downloadProgress.value = 0
      }
    })
    
    unlistenInstallProgress = await safeListen('game-install-progress', (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = event.payload.progress || 0
        downloadedSize.value = event.payload.downloaded || '0 MB'
        totalSize.value = event.payload.total || '0 MB'
        downloadSpeed.value = event.payload.speed || 'N/A'
      }
    })
    
    unlistenInstalled = await safeListen('game-installed', (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        downloadProgress.value = 100
        setTimeout(() => {
          isDownloading.value = false
          libraryStore.fetchGames()
        }, 1500)
      }
    })
    
    unlistenInstallFailed = await safeListen('game-install-failed', (event: any) => {
      if (event.payload?.gameId === gameId.value) {
        isDownloading.value = false
        console.error('Install failed:', event.payload?.error)
      }
    })
  } catch (e) {
    console.warn('[GameDetails] Failed to setup Tauri event listeners (expected in E2E tests):', e)
  }
})

onUnmounted(() => {
  unlistenInstalling?.()
  unlistenInstallProgress?.()
  unlistenInstalled?.()
  unlistenInstallFailed?.()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
