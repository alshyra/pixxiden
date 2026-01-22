<template>
  <div class="library-view">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-3xl font-display font-bold mb-6">Your Library</h2>
      
      <!-- Filters -->
      <div class="flex items-center gap-4 mb-6">
        <!-- Store Filter -->
        <div class="flex gap-2">
          <button 
            v-for="store in stores" 
            :key="store.id"
            @click="selectedStore = store.id"
            class="px-4 py-2 rounded-lg font-medium transition-all"
            :class="selectedStore === store.id 
              ? 'bg-remix-accent text-white shadow-glow' 
              : 'bg-remix-bg-card text-remix-text-secondary hover:bg-remix-bg-hover'">
            {{ store.name }}
          </button>
        </div>

        <!-- Sort -->
        <select 
          v-model="sortBy"
          class="ml-auto px-4 py-2 bg-remix-bg-card border border-remix-border rounded-lg
                 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent">
          <option value="title">Title</option>
          <option value="playtime">Play Time</option>
          <option value="recent">Recently Played</option>
        </select>

        <!-- Sync Button -->
        <button 
          @click="syncLibrary"
          :disabled="syncing"
          class="px-4 py-2 bg-remix-accent hover:bg-remix-accent-hover disabled:opacity-50
                 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <span :class="{ 'animate-spin': syncing }">↻</span>
          Sync
        </button>
        
        <!-- Scan GOG Button -->
        <button 
          @click="scanGogGames"
          :disabled="loading"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50
                 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          title="Scan ~/GOG Games/ directory">
          <span>🔍</span>
          Scan GOG
        </button>
      </div>
    </div>

    <!-- Games Grid -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-12 h-12 border-4 border-remix-accent border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-remix-text-secondary">Loading your games...</p>
    </div>

    <div v-else-if="filteredGames.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">🎮</div>
      <p class="text-xl text-remix-text-secondary">No games found</p>
      <p class="text-sm text-remix-text-secondary mt-2">
        Try syncing your library or adding games from your stores
      </p>
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
      <div 
        v-for="game in filteredGames" 
        :key="game.id"
        @click="selectGame(game)"
        class="group relative overflow-hidden rounded-xl bg-remix-bg-card 
               hover:bg-remix-bg-hover transition-all duration-300 cursor-pointer
               shadow-card hover:shadow-card-hover aspect-[3/4]"
      >
        <!-- Cover Image Placeholder -->
        <div class="w-full h-full flex items-center justify-center bg-gradient-card">
          <span class="text-4xl">🎮</span>
        </div>
        
        <!-- Game Info Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <h3 class="text-white font-semibold text-lg mb-1 truncate">
              {{ game.title }}
            </h3>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-remix-accent/20 text-remix-accent">
                {{ game.store }}
              </span>
              <span v-if="game.installed" class="px-2 py-1 rounded-full text-xs font-medium bg-remix-success/20 text-remix-success">
                Installed
              </span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            v-if="game.installed"
            @click.stop="playGame(game.id)"
            class="p-2 rounded-full bg-remix-success hover:bg-green-600 transition-colors shadow-lg"
            title="Play">
            ▶
          </button>
          <button 
            v-else
            @click.stop="installGame(game.id)"
            class="p-2 rounded-full bg-remix-accent hover:bg-remix-accent-hover transition-colors shadow-lg"
            title="Install">
            ⬇
          </button>
        </div>
      </div>
    </div>
    
    <!-- Launch Overlay -->
    <LaunchOverlay 
      :is-visible="isLaunching"
      :game-title="launchingGame?.title || 'Game'"
      :runner="launchRunner"
      :error="launchError"
      @close="closeLaunchOverlay"
      @launched="onGameLaunched"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useLibraryStore } from '@/stores/library'
import LaunchOverlay from '@/components/game/LaunchOverlay.vue'
import type { Game } from '@/types'

const router = useRouter()
const libraryStore = useLibraryStore()

const selectedStore = ref('all')
const sortBy = ref('title')

// Use store's loading/syncing states
const loading = computed(() => libraryStore.loading)
const syncing = computed(() => libraryStore.syncing)

// Launch overlay state
const isLaunching = ref(false)
const launchingGame = ref<Game | null>(null)
const launchError = ref<string | null>(null)
const launchRunner = computed(() => {
  if (!launchingGame.value) return undefined
  switch (launchingGame.value.store) {
    case 'epic': return 'Legendary (Epic Games)'
    case 'gog': return 'Wine-GE (GOG)'
    case 'amazon': return 'Nile (Amazon Games)'
    default: return launchingGame.value.store
  }
})

// Event listeners
let unlistenLaunching: UnlistenFn | undefined
let unlistenLaunched: UnlistenFn | undefined
let unlistenFailed: UnlistenFn | undefined

const stores = [
  { id: 'all', name: 'All Games' },
  { id: 'epic', name: 'Epic' },
  { id: 'gog', name: 'GOG' },
  { id: 'amazon', name: 'Amazon' },
]

const filteredGames = computed(() => {
  let games = [...libraryStore.games]
  
  // Filter by store
  if (selectedStore.value !== 'all') {
    games = games.filter(g => g.store === selectedStore.value)
  }
  
  // Sort
  switch (sortBy.value) {
    case 'title':
      games.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'playtime':
      games.sort((a, b) => (b.playTime || 0) - (a.playTime || 0))
      break
    case 'recent':
      games.sort((a, b) => {
        const timeA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
        const timeB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
        return timeB - timeA
      })
      break
  }
  
  return games
})

async function syncLibrary() {
  await libraryStore.syncLibrary()
}

async function scanGogGames() {
  try {
    await libraryStore.scanGogInstalled()
  } catch (error) {
    console.error('Failed to scan GOG games:', error)
  }
}

function selectGame(game: Game) {
  router.push(`/game/${game.id}`)
}

async function installGame(gameId: string) {
  try {
    await libraryStore.installGame(gameId)
  } catch (error) {
    console.error('Failed to install game:', error)
  }
}

async function playGame(gameId: string) {
  const game = libraryStore.games.find(g => g.id === gameId)
  if (!game) return
  
  // Reset state and show overlay
  launchingGame.value = game
  launchError.value = null
  isLaunching.value = true
  
  try {
    await libraryStore.launchGame(gameId)
    // Success will be handled by event listener
  } catch (error: any) {
    launchError.value = error?.message || error?.toString() || 'Unknown error'
    console.error('Failed to launch game:', error)
  }
}

function closeLaunchOverlay() {
  isLaunching.value = false
  launchError.value = null
  launchingGame.value = null
}

function onGameLaunched() {
  // Hide overlay after successful launch
  setTimeout(() => {
    isLaunching.value = false
    launchingGame.value = null
  }, 500)
}

onMounted(async () => {
  libraryStore.fetchGames()
  
  // Listen to Tauri events
  unlistenLaunching = await listen('game-launching', (event: any) => {
    console.log('🚀 Game launching:', event.payload)
    const game = libraryStore.games.find(g => g.id === event.payload?.gameId)
    if (game) {
      launchingGame.value = game
      isLaunching.value = true
      launchError.value = null
    }
  })
  
  unlistenLaunched = await listen('game-launched', (event: any) => {
    console.log('✅ Game launched:', event.payload)
    onGameLaunched()
  })
  
  unlistenFailed = await listen('game-launch-failed', (event: any) => {
    console.log('❌ Game launch failed:', event.payload)
    launchError.value = event.payload?.error || 'Unknown error'
  })
})

onUnmounted(() => {
  if (unlistenLaunching) unlistenLaunching()
  if (unlistenLaunched) unlistenLaunched()
  if (unlistenFailed) unlistenFailed()
})
</script>
