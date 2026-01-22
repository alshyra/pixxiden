<template>
  <div class="fullscreen-view relative min-h-screen bg-black overflow-hidden">
    <!-- Top Bar -->
    <TopBar 
      :now-playing="playingGame"
    />
    
    <!-- Hero Banner -->
    <HeroBanner 
      :game="selectedGame" 
      :metadata="selectedMetadata"
      @open-details="openGameDetails()"
    />
    
    <!-- Games Carousel -->
    <div class="absolute bottom-20 left-0 right-0">
      <GameCarousel 
        :games="filteredGames"
        :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id"
        @select="selectGame"
        @open="openGameDetails"
      />
    </div>
    
    <!-- Bottom Filters -->
    <BottomFilters v-model="currentFilter" />
    
    <!-- Loading Overlay -->
    <div 
      v-if="loading"
      class="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p class="text-white/60">Loading your library...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { TopBar, BottomFilters } from '@/components/layout'
import { HeroBanner, GameCarousel } from '@/components/game'
import type { Game } from '@/types'

const router = useRouter()
const libraryStore = useLibraryStore()

const loading = ref(true)
const currentFilter = ref('all')
const selectedGame = ref<Game | null>(null)
const playingGame = ref<Game | null>(null)
const selectedMetadata = ref<{ releaseDate?: string; genres?: string[]; metacritic?: number }>()

// Filter games based on current filter
const filteredGames = computed(() => {
  let games = [...libraryStore.games]
  
  switch (currentFilter.value) {
    case 'installed':
      games = games.filter(g => g.installed)
      break
    case 'most-played':
      games = games.filter(g => g.playTime && g.playTime > 0)
        .sort((a, b) => (b.playTime || 0) - (a.playTime || 0))
      break
    case 'recent':
      games = games.filter(g => g.lastPlayed)
        .sort((a, b) => {
          const timeA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
          const timeB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
          return timeB - timeA
        })
      break
    case 'recently-added':
      games = games.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      break
    default:
      games = games.sort((a, b) => a.title.localeCompare(b.title))
  }
  
  return games
})

function selectGame(game: Game) {
  selectedGame.value = game
  // TODO: Fetch metadata for the game
}

function openGameDetails(game?: Game) {
  const gameToOpen = game || selectedGame.value
  if (gameToOpen) {
    router.push(`/game/${gameToOpen.id}`)
  }
}

async function loadGames() {
  loading.value = true
  try {
    await libraryStore.fetchGames()
    // Auto-select first game
    if (filteredGames.value.length > 0 && !selectedGame.value) {
      selectedGame.value = filteredGames.value[0]
    }
  } catch (error) {
    console.error('Failed to load games:', error)
  } finally {
    loading.value = false
  }
}

// When filter changes, update selection
watch(filteredGames, (games) => {
  if (games.length > 0 && (!selectedGame.value || !games.find(g => g.id === selectedGame.value?.id))) {
    selectedGame.value = games[0]
  }
})


function handleKeyPress(e: KeyboardEvent) {
  // Enter or Space to open details
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openGameDetails()
  }
}

onMounted(() => {
  loadGames()
  // Keyboard/Gamepad navigation
  window.addEventListener('keydown', handleKeyPress)
})

</script>

<style scoped>
.fullscreen-view {
  user-select: none;
}
</style>
