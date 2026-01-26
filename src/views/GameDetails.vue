<template>
  <div class="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden relative flex flex-col">
    <!-- Hero Section -->
    <GameHeroSection :image-url="heroImage" :title="game?.title" />

    <!-- Main Content -->
    <div class="flex-1 max-w-[1500px] mx-auto px-10 -mt-2 relative z-20 w-full mb-6">
      <div class="grid grid-cols-12 gap-6 h-full items-start">

        <!-- Left Column: Game Info Card -->
        <div class="col-span-12 lg:col-span-4 space-y-4 h-full flex flex-col">
          <GameInfoCard 
            :title="game?.title"
            :developer="game?.developer" 
            :release-year="gameReleaseYear"
            :cover-url="game?.coverUrl" 
            :score="scoreBadge?.score"
            :genre="game?.genres?.[0]"
            :play-time="formattedPlayTime" 
            :last-played="formattedLastPlayed" 
            :status="completionStatus"
            :achievements-unlocked="achievementsProgress?.unlocked" :achievements-total="achievementsProgress?.total">
            <template #actions>
              <GameActions :installed="!!game?.installed" :downloading="isDownloading" :launching="isLaunching"
                :download-progress="downloadProgress" :download-speed="downloadSpeed" :downloaded-size="downloadedSize"
                :total-size="totalSize" @install="showInstallModal = true" @play="playGame"
                @force-close="forceCloseGame" />
            </template>
          </GameInfoCard>
        </div>

        <!-- Right Column: Stats & Synopsis -->
        <div class="col-span-12 lg:col-span-8 space-y-6 h-full flex flex-col">
          <!-- Stats Grid -->
          <GameStatsGrid :install-size="game?.installSize" :duration="gameDurations?.formattedRange"
            :score="scoreBadge?.score" :proton-tier="game?.protonTier" />

          <!-- Synopsis -->
          <section class="px-2 overflow-hidden flex-shrink">
            <h3 class="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">
              Synopsis
            </h3>
            <p class="text-xs text-gray-400 leading-snug italic line-clamp-4 opacity-80">
              {{ game?.description || 'Missing description' }}
            </p>
          </section>
        </div>
      </div>
    </div>

    <!-- Modals & Overlays -->
    <InstallModal v-if="game" v-model="showInstallModal" :game="game" @install-started="handleStartInstallation" />

    <LaunchOverlay :is-visible="isLaunching" :game-title="game?.title || 'Game'" :runner="launchRunner"
      :error="launchError" @close="closeLaunchOverlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useGamepad } from '@/composables/useGamepad'
import {
  GameHeroSection,
  GameInfoCard,
  GameActions,
  GameStatsGrid,
  InstallModal,
  LaunchOverlay,
} from '@/components/game'
import type { Game } from '@/types'

type UnlistenFn = () => void

// === TAURI HELPERS ===
let convertFileSrc: ((path: string) => string) | null = null

const loadConvertFileSrc = async () => {
  try {
    const { convertFileSrc: fn } = await import('@tauri-apps/api/core')
    convertFileSrc = fn
  } catch (e) {
    console.warn('[GameDetails] convertFileSrc not available (E2E mode):', e)
    convertFileSrc = (path: string) => path
  }
}

const safeListen = async (event: string, handler: (event: any) => void): Promise<UnlistenFn> => {
  try {
    const { listen } = await import('@tauri-apps/api/event')
    return listen(event, handler)
  } catch (e) {
    console.warn(`[GameDetails] Failed to setup listener for '${event}':`, e)
    return () => { }
  }
}

// === ROUTER & STORE ===
const route = useRoute()
const router = useRouter()
const libraryStore = useLibraryStore()
const { on: onGamepad } = useGamepad()

// === STATE ===
const showInstallModal = ref(false)
const showSettings = ref(false)
const gameId = computed(() => route.params.id as string)
const game = computed<Game | undefined>(() => libraryStore.getGame(gameId.value))

// Download state
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedSize = ref('0 MB')
const totalSize = computed(() => game.value?.installSize || 'N/A')
const downloadSpeed = ref('0 MB/s')

// Launch state
const isLaunching = ref(false)
const launchError = ref<string | null>(null)

// Session tracking
const showSessionRecap = ref(false)
const sessionStartTime = ref<Date | null>(null)
const sessionEndTime = ref<Date | null>(null)
const sessionDuration = ref(0)

// Event listeners
let unlistenInstalling: UnlistenFn | undefined
let unlistenInstallProgress: UnlistenFn | undefined
let unlistenInstalled: UnlistenFn | undefined
let unlistenInstallFailed: UnlistenFn | undefined
let unlistenLaunching: UnlistenFn | undefined
let unlistenLaunched: UnlistenFn | undefined
let unlistenFailed: UnlistenFn | undefined

// === COMPUTED ===
const heroImage = computed(() => {
  if (!game.value) return ''
  if (game.value.heroPath && convertFileSrc) {
    return convertFileSrc(game.value.heroPath)
  }
  return game.value.backgroundUrl || ''
})

const gameReleaseYear = computed(() => {
  if (!game.value?.releaseDate) return undefined
  return new Date(game.value.releaseDate).getFullYear()
})

const scoreBadge = computed(() => {
  if (!game.value) return null
  const score = game.value.metacriticScore || Math.round(game.value.igdbRating || 0)
  if (!score) return null
  return { score }
})

const gameDurations = computed(() => {
  if (!game.value) return null
  const { hltbMain, hltbComplete } = game.value
  if (!hltbMain && !hltbComplete) return null
  return {
    formattedRange: hltbMain && hltbComplete
      ? `${hltbMain}-${hltbComplete}h`
      : (hltbMain ? `~${hltbMain}h` : '-'),
  }
})

const achievementsProgress = computed(() => {
  if (!game.value?.achievementsTotal) return null
  return {
    total: game.value.achievementsTotal,
    unlocked: game.value.achievementsUnlocked || 0,
  }
})

const formattedPlayTime = computed(() => {
  const minutes = game.value?.playTimeMinutes || 0
  if (minutes === 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
})

const formattedLastPlayed = computed(() => {
  if (!game.value?.lastPlayed) return 'Jamais'
  return new Date(game.value.lastPlayed).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
})

const completionStatus = computed(() => {
  const minutes = game.value?.playTimeMinutes || 0
  if (minutes === 0) return 'Non joué'
  if (minutes > 3600) return 'Terminé'
  if (minutes > 1200) return 'En cours'
  return 'Commencé'
})

const launchRunner = computed(() => {
  if (!game.value) return undefined
  const runners: Record<string, string> = {
    epic: 'Legendary (Epic Games)',
    gog: 'GOGdl (GOG Galaxy)',
    amazon: 'Nile (Amazon Games)',
    steam: 'Steam',
  }
  return runners[game.value.store] || game.value.store
})

// === METHODS ===
async function playGame() {
  if (!game.value) return

  launchError.value = null
  isLaunching.value = true
  sessionStartTime.value = new Date()
  sessionEndTime.value = null
  sessionDuration.value = 0

  try {
    await libraryStore.launchGame(game.value.id)
  } catch (error: any) {
    launchError.value = error?.message || error?.toString() || 'Unknown error'
    console.error('Failed to launch game:', error)
    sessionStartTime.value = null
  }
}

async function forceCloseGame() {
  if (!game.value) return

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('force_close_game', { gameId: game.value.id })
    endSession()
  } catch (error) {
    console.error('Failed to force close game:', error)
  } finally {
    isLaunching.value = false
    launchError.value = null
  }
}

function endSession() {
  if (!sessionStartTime.value) return
  sessionEndTime.value = new Date()
  sessionDuration.value = Math.floor(
    (sessionEndTime.value.getTime() - sessionStartTime.value.getTime()) / 1000
  )
  showSessionRecap.value = true
}

function closeLaunchOverlay() {
  isLaunching.value = false
  launchError.value = null
}

async function handleStartInstallation(config: any) {
  showInstallModal.value = false
  isDownloading.value = true
  downloadProgress.value = 0

  if (game.value) {
    try {
      await libraryStore.installGame(game.value.id, config.installPath)
    } catch (error) {
      console.error('Failed to start installation:', error)
      isDownloading.value = false
    }
  }
}

// === INPUT HANDLERS ===
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
    e.preventDefault()
    router.back()
    return
  }

  if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') {
    e.preventDefault()
    if (game.value?.installed) {
      playGame()
    } else {
      showInstallModal.value = true
    }
    return
  }

  if (e.key === 'x' || e.key === 'X') {
    e.preventDefault()
    showSettings.value = true
  }
}

onGamepad('back', () => router.back())
onGamepad('confirm', () => game.value?.installed ? playGame() : showInstallModal.value = true)
onGamepad('options', () => showSettings.value = true)

// === LIFECYCLE ===
onMounted(async () => {
  await loadConvertFileSrc()

  if (libraryStore.games.length === 0) {
    await libraryStore.fetchGames()
  }

  window.addEventListener('keydown', handleKeyDown)

  // Setup Tauri event listeners
  unlistenLaunching = await safeListen('game-launching', (event: any) => {
    if (event.payload?.gameId === gameId.value) {
      isLaunching.value = true
      launchError.value = null
    }
  })

  unlistenLaunched = await safeListen('game-launched', (event: any) => {
    if (event.payload?.gameId === gameId.value) {
      setTimeout(() => isLaunching.value = false, 500)
    }
  })

  unlistenFailed = await safeListen('game-launch-failed', (event: any) => {
    if (event.payload?.gameId === gameId.value) {
      launchError.value = event.payload?.error || 'Unknown error'
    }
  })

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
      downloadSpeed.value = event.payload.speed || '0 MB/s'
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
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  unlistenLaunching?.()
  unlistenLaunched?.()
  unlistenFailed?.()
  unlistenInstalling?.()
  unlistenInstallProgress?.()
  unlistenInstalled?.()
  unlistenInstallFailed?.()
})
</script>
