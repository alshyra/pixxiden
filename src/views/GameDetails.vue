<template>
  <div class="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden relative flex flex-col">

    <!-- SECTION HERO (45vh) -->
    <div class="relative h-[45vh] w-full overflow-hidden shrink-0 bg-[#0a0a0a]">
      <!-- Background Image -->
      <div
        class="absolute inset-0 bg-cover bg-center opacity-50 scale-100 transition-opacity duration-1000 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-black">
        <img v-if="heroImage || game?.backgroundUrl" :src="heroImage || game?.backgroundUrl" :alt="game?.title"
          class="w-full h-full object-cover" />
      </div>

      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505]"></div>

      <!-- Titre Centré (position absolute) -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none text-center z-10">
        <h1
          class="text-[100px] font-black italic tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] leading-none uppercase">
          {{ (game?.title || 'GAME').toUpperCase() }}
        </h1>
        <div class="flex gap-4 mt-2 opacity-30">
          <div class="w-12 h-[1px] bg-[#5e5ce6] shadow-[0_0_8px_#5e5ce6]"></div>
          <div class="w-12 h-[1px] bg-[#5e5ce6] shadow-[0_0_8px_#5e5ce6]"></div>
        </div>
      </div>
    </div>

    <!-- CONTENU PRINCIPAL -->
    <div class="flex-1 max-w-[1500px] mx-auto px-10 -mt-24 relative z-20 w-full mb-6">
      <div class="grid grid-cols-12 gap-6 h-full items-start">

        <!-- COLONNE GAUCHE (4/12) -->
        <div class="col-span-12 lg:col-span-4 space-y-4 h-full flex flex-col">
          <div
            class="bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">

            <!-- Header Card -->
            <div class="flex p-5 gap-5 border-b border-white/5 bg-white/2 items-center">
              <div class="w-24 h-24 shrink-0 bg-[#1a1a1e] rounded-lg overflow-hidden border border-white/10 shadow-xl">
                <div
                  class="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center">
                  <span class="text-4xl">🎮</span>
                </div>
              </div>
              <div>
                <h2 class="text-xl font-black italic tracking-tight text-white leading-tight">
                  {{ game?.title?.toUpperCase() || 'HOLLOW KNIGHT' }}
                </h2>
                <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                  {{ game?.developer || 'TEAM CHERRY' }} • 2017
                </p>
                <div class="flex gap-2 mt-2">
                  <span
                    class="bg-green-500/20 text-green-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-green-500/20">93</span>
                  <span
                    class="bg-white/5 text-gray-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest">INDÉ</span>
                </div>
              </div>
            </div>

            <!-- Install Button Section -->
            <div class="p-5 bg-gradient-to-b from-white/2 to-transparent">
              <button v-if="!game?.installed && !isDownloading" @click="showInstallModal = true"
                class="w-full bg-[#5e5ce6] hover:bg-[#6e6cf7] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(94,92,230,0.3)] transition-all flex items-center justify-center gap-3 group">
                <span class="text-lg group-hover:translate-y-0.5 transition-transform">↓</span>
                Installer
              </button>

              <!-- Download Progress -->
              <div v-if="isDownloading" class="space-y-3">
                <div class="flex justify-between items-end">
                  <span class="text-[9px] font-black uppercase tracking-widest text-[#5e5ce6]">Téléchargement...</span>
                  <span class="text-[10px] font-bold text-white">{{ Math.floor(downloadProgress) }}%</span>
                </div>
                <div class="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                  <div
                    class="h-full bg-gradient-to-r from-[#5e5ce6] to-[#a78bfa] rounded-full shadow-[0_0_15px_rgba(94,92,230,0.6)] transition-all duration-300"
                    :style="{ width: `${downloadProgress}%` }"></div>
                </div>
                <div class="flex justify-between text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                  <span>{{ downloadSpeed }}</span>
                  <span>{{ downloadedSize }} / {{ totalSize }}</span>
                </div>
              </div>

              <!-- Play Button -->
              <button v-else-if="game?.installed" @click="playGame"
                class="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-3">
                <span class="text-lg">▶</span> Lancer le jeu
              </button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 text-center border-y border-white/5 bg-white/2">
              <div class="p-3 border-r border-white/5 flex flex-col items-center">
                <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Temps</span>
                <span class="text-xs font-bold text-white">{{ formattedPlayTime }}</span>
              </div>
              <div class="p-3 border-r border-white/5 flex flex-col items-center">
                <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Dernier</span>
                <span class="text-xs font-bold text-white">{{ formattedLastPlayed }}</span>
              </div>
              <div class="p-3 flex flex-col items-center">
                <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Statut</span>
                <span class="text-xs font-bold text-orange-400 italic">{{ completionStatus }}</span>
              </div>
            </div>

            <!-- Achievements -->
            <div class="p-6 space-y-3">
              <div class="flex justify-between items-end">
                <span class="text-[10px] font-black uppercase tracking-widest text-[#5e5ce6]">Succès</span>
                <span v-if="achievementsProgress" class="text-[9px] font-bold text-gray-500">{{
                  achievementsProgress.unlocked }}/{{ achievementsProgress.total }}</span>
                <span v-else class="text-[9px] font-bold text-gray-500">--/--</span>
              </div>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-[#5e5ce6]" :style="{ width: `${achievementsProgress?.percentage ?? 0}%` }"></div>
              </div>
            </div>
          </div>

          <!-- Synopsis -->
          <div class="px-2 overflow-hidden flex-shrink">
            <h3 class="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 italic">Synopsis</h3>
            <p class="text-xs text-gray-400 leading-snug italic line-clamp-4 opacity-80">
              {{ game?.description || 'Missing description' }}
            </p>
          </div>
        </div>

        <!-- COLONNE DROITE (8/12) -->
        <div class="col-span-12 lg:col-span-8 space-y-6 h-full flex flex-col">
          <!-- Gameplay Image/Video -->
          <div
            class="relative flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer max-h-[460px] bg-[#1a1a1e]">
            <!-- Background Placeholder -->
            <div
              class="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-cyan-900/20 transition-transform duration-700 group-hover:scale-105 opacity-80">
            </div>

            <!-- Play Button Overlay -->
            <div
              class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div
                class="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div
                  class="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-2">
                </div>
              </div>
            </div>
          </div>

          <!-- Stats Bottom -->
          <div class="grid grid-cols-4 gap-4 shrink-0 pb-2">
            <div class="bg-[#0f0f12] border border-white/5 p-4 rounded-xl flex flex-col">
              <span class="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">Taille</span>
              <div class="text-xl font-black italic mt-0.5 text-cyan-400">{{ enrichedGame?.install_size ||
                game?.installSize || '--' }}</div>
            </div>
            <div class="bg-[#0f0f12] border border-white/5 p-4 rounded-xl flex flex-col">
              <span class="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">Durée</span>
              <div class="text-xl font-black italic mt-0.5 text-pink-400">{{ gameDurations?.formattedRange || '--' }}
              </div>
            </div>
            <div class="bg-[#0f0f12] border border-white/5 p-4 rounded-xl flex flex-col">
              <span class="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">Note</span>
              <div class="text-xl font-black italic mt-0.5" :class="scoreBadge?.colorClass || 'text-gray-400'">
                {{ scoreBadge?.display || '--' }}
              </div>
            </div>
            <div class="bg-[#0f0f12] border border-white/5 p-4 rounded-xl flex flex-col">
              <span class="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">ProtonDB</span>
              <div class="text-xl font-black italic mt-0.5" :class="protonBadge?.colorClass || 'text-gray-400'">
                {{ protonBadge?.tier || '--' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Install Modal -->
    <InstallModal v-model="showInstallModal" :game="game" @install-started="handleStartInstallation" />

    <!-- Launch Overlay -->
    <LaunchOverlay :is-visible="isLaunching" :game-title="game?.title || 'Hollow Knight'" :runner="launchRunner"
      :error="launchError" @close="closeLaunchOverlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import InstallModal from '@/components/game/InstallModal.vue'
import LaunchOverlay from '@/components/game/LaunchOverlay.vue'
import type { EnrichedGame } from '@/types'
import { ProtonTierUtils } from '@/types'

type UnlistenFn = () => void

// Tauri convertFileSrc helper
let convertFileSrc: ((path: string) => string) | null = null

const loadConvertFileSrc = async () => {
  try {
    const { convertFileSrc: fn } = await import('@tauri-apps/api/core')
    convertFileSrc = fn
  } catch (e) {
    console.warn('[GameDetails] convertFileSrc not available (E2E mode):', e)
    // Fallback: return path as-is (won't work but allows E2E testing)
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

const route = useRoute()
const libraryStore = useLibraryStore()

const showInstallModal = ref(false)
const gameId = computed(() => route.params.id as string)

// Use enriched game data when available, fall back to base game
const enrichedGame = computed<EnrichedGame | undefined>(() =>
  libraryStore.getEnrichedGame(gameId.value)
)
const game = computed(() =>
  enrichedGame.value || libraryStore.games.find(g => g.id === gameId.value)
)

const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedSize = ref('0 MB')
const totalSize = ref('9.2 GB')
const downloadSpeed = ref('0 MB/s')

const isLaunching = ref(false)
const launchError = ref<string | null>(null)
const launchRunner = computed(() => {
  if (!game.value) return undefined
  switch (game.value.store) {
    case 'epic': return 'Legendary (Epic Games)'
    case 'gog': return 'GOGdl (GOG Galaxy)'
    case 'amazon': return 'Nile (Amazon Games)'
    case 'steam': return 'Steam'
    default: return game.value.store
  }
})

let unlistenInstalling: UnlistenFn | undefined
let unlistenInstallProgress: UnlistenFn | undefined
let unlistenInstalled: UnlistenFn | undefined
let unlistenInstallFailed: UnlistenFn | undefined

// === COMPUTED PROPERTIES FOR ENRICHED DATA ===

// Hero background image
const heroImage = computed(() => {
  if (!enrichedGame.value) return ''

  // Prefer local hero path, then background URL
  if (enrichedGame.value.heroPath && convertFileSrc) {
    return convertFileSrc(enrichedGame.value.heroPath)
  }
  return enrichedGame.value.backgroundUrl || ''
})

// Score badge (Metacritic or IGDB rating)
const scoreBadge = computed(() => {
  if (!enrichedGame.value) return null

  const score = enrichedGame.value.metacriticScore ||
    Math.round(enrichedGame.value.igdbRating || 0)

  if (!score) return null

  let colorClass = 'bg-red-500/20 text-red-500 border-red-500/20'
  if (score >= 75) colorClass = 'bg-green-500/20 text-green-500 border-green-500/20'
  else if (score >= 50) colorClass = 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'

  return { score, colorClass }
})

// ProtonDB badge
const protonBadge = computed(() => {
  if (!enrichedGame.value?.protonTier) return null

  const tier = enrichedGame.value.protonTier
  return {
    tier,
    label: tier.toUpperCase(),
    colorClass: ProtonTierUtils.getColorClass(tier),
    isPlayable: ProtonTierUtils.isPlayable(tier),
  }
})

// HowLongToBeat durations
const gameDurations = computed(() => {
  if (!enrichedGame.value) return null

  const { hltbMain, hltbMainExtra, hltbComplete } = enrichedGame.value
  if (!hltbMain && !hltbComplete) return null

  return {
    main: hltbMain,
    mainExtra: hltbMainExtra,
    complete: hltbComplete,
    formattedMain: hltbMain ? `${hltbMain}h` : '-',
    formattedRange: hltbMain && hltbComplete ? `${hltbMain}-${hltbComplete}h` : (hltbMain ? `~${hltbMain}h` : '-'),
  }
})

// Achievements progress
const achievementsProgress = computed(() => {
  if (!enrichedGame.value?.achievementsTotal) return null

  const { achievementsTotal, achievementsUnlocked = 0 } = enrichedGame.value
  const percentage = Math.round((achievementsUnlocked / achievementsTotal) * 100)

  return {
    total: achievementsTotal,
    unlocked: achievementsUnlocked,
    percentage,
  }
})

// Genres formatted
const genresList = computed(() => {
  if (!enrichedGame.value?.genres?.length) return null
  return enrichedGame.value.genres.slice(0, 3) // Max 3 genres
})

// Release year
const releaseYear = computed(() => {
  const date = enrichedGame.value?.releaseDate || game.value?.releaseDate
  if (!date) return null
  return new Date(date).getFullYear()
})

const formattedPlayTime = computed(() => {
  const minutes = game.value?.playTimeMinutes || game.value?.playTime || 0
  if (minutes === 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
})

const formattedLastPlayed = computed(() => {
  if (!game.value?.lastPlayed) return 'Jamais'
  const date = new Date(game.value.lastPlayed)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
})

const completionStatus = computed(() => {
  const minutes = game.value?.playTimeMinutes || game.value?.playTime || 0
  if (minutes === 0) return 'Non joué'
  if (minutes > 3600) return 'Terminé'
  if (minutes > 1200) return 'En cours'
  return 'Commencé'
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

onMounted(async () => {
  // Load Tauri helpers
  await loadConvertFileSrc()

  // Fetch enriched games if not already loaded
  if (libraryStore.enrichedGames.length === 0) {
    await libraryStore.fetchEnrichedGames()
  }

  console.log('🎮 Game data:', game.value)
  console.log('🎮 Enriched data:', enrichedGame.value)

  try {
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
        totalSize.value = event.payload.total || '9.2 GB'
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
  } catch (e) {
    console.warn('[GameDetails] Failed to setup Tauri event listeners:', e)
  }
})

onUnmounted(() => {
  unlistenInstalling?.()
  unlistenInstallProgress?.()
  unlistenInstalled?.()
  unlistenInstallFailed?.()
})
</script>