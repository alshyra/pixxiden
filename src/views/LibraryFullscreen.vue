<template>
  <div class="relative min-h-screen bg-remix-black overflow-hidden pb-20 transition-all duration-600">
    <!-- Hero Banner -->
    <HeroBanner 
      :game="selectedGame"
      :metadata="selectedMetadataGame"
      @open-details="openGameDetails(selectedGame)"
      class="transition-all duration-600"
    />
    
    <!-- Games Carousel -->
    <div class="absolute bottom-14 left-0 right-0">
      <GameCarousel
        :games="filteredGames"
        :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id"
        @select="selectGame"
        @open="openGameDetails"
      />
    </div>
    
    <!-- Bottom Filters -->
    <BottomFilters
      :filters="filters"
      v-model="currentFilter"
    />
    
    <!-- Loading Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="loading" 
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm"
      >
        <div class="w-12 h-12 border-4 border-white/20 border-t-remix-accent rounded-full animate-spin mb-4" />
        <p class="text-white/60 text-sm font-medium">Chargement de votre bibliothèque...</p>
      </div>
    </Transition>
    
    <!-- Empty State -->
    <Transition
      enter-active-class="transition-all duration-500"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="!loading && filteredGames.length === 0" 
        class="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
      >
        <div class="mb-6 opacity-50">
          <svg class="w-24 h-24 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        
        <h2 class="text-2xl font-bold text-white mb-2">
          {{ currentFilter === 'all' ? 'Aucun jeu trouvé' : 'Aucun jeu dans ce filtre' }}
        </h2>
        
        <p class="text-sm text-white/50 mb-8 max-w-sm">
          {{ currentFilter === 'all' 
            ? 'Synchronisez vos bibliothèques pour commencer à jouer' 
            : 'Changez de filtre pour voir vos autres jeux'
          }}
        </p>
        
        <button 
          v-if="currentFilter === 'all'"
          @click="syncLibrary"
          :disabled="syncing"
          class="flex items-center gap-2 px-6 py-3 bg-remix-accent text-white font-semibold text-sm rounded-xl shadow-glow hover:bg-remix-accent-hover hover:-translate-y-0.5 hover:shadow-glow-strong transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg 
            class="w-5 h-5" 
            :class="{ 'animate-spin': syncing }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ syncing ? 'Synchronisation...' : 'Synchroniser les bibliothèques' }}</span>
        </button>
      </div>
    </Transition>
    
    <!-- Game Count Badge -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div 
        v-if="!loading && filteredGames.length > 0"
        class="fixed bottom-20 right-4 sm:right-8 px-4 py-2 bg-black/80 border border-white/10 rounded-lg text-xs font-semibold text-white/50 backdrop-blur-md"
      >
        {{ filteredGames.length }} {{ filteredGames.length === 1 ? 'jeu' : 'jeux' }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useFocusNavigation } from '@/composables/useFocusNavigation'
import type { Game } from '@/types'
import GameCarousel from '@/components/game/GameCarousel.vue'
import { HeroBanner } from '@/components/game'
import { BottomFilters } from '@/components/layout'

const router = useRouter()
const libraryStore = useLibraryStore()

// Local state
const loading = ref(true)
const syncing = ref(false)
const currentFilter = ref('all')
const gridColumns = ref(5)
const selectedGame = ref<Game | null>(null)
const playingGame = ref<Game | null>(null)
const selectedMetadataGame = ref(null)

// Filters
const filters = [
  { label: 'Tous', value: 'all', icon: '🎮' },
  { label: 'Installés', value: 'installed', icon: '💾' },
  { label: 'Les + joués', value: 'most-played', icon: '⭐' },
  { label: 'Récents', value: 'recent', icon: '🕐' }
]

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
    default:
      games = games.sort((a, b) => a.title.localeCompare(b.title))
  }
  
  return games
})

// Focus navigation
const { 
  focusedIndex, 
  updateFocusables, 
  setGridColumns,
} = useFocusNavigation('.focusable-game', {
  gridColumns: gridColumns.value,
  autoScroll: true
})

// Update grid columns based on window width
function updateGridColumns() {
  const width = window.innerWidth
  if (width < 768) {
    gridColumns.value = 2
  } else if (width < 1024) {
    gridColumns.value = 3
  } else if (width < 1440) {
    gridColumns.value = 4
  } else {
    gridColumns.value = 5
  }
  setGridColumns(gridColumns.value)
}

// Select a game
function selectGame(game: Game) {
  selectedGame.value = game
}

// Open game details
function openGameDetails(game: Game | null) {
  const gameToOpen = game || selectedGame.value
  if (!gameToOpen) return
  router.push(`/game/${gameToOpen.id}`)
}

// Open settings
function openSettings() {
  router.push('/settings')
}

// Sync library
async function syncLibrary() {
  syncing.value = true
  try {
    await libraryStore.syncLibrary()
  } catch (error) {
    console.error('Failed to sync library:', error)
  } finally {
    syncing.value = false
  }
}

// Load games
async function loadGames() {
  loading.value = true
  try {
    await libraryStore.fetchGames()
    
    // Auto-select first game
    if (filteredGames.value.length > 0) {
      selectedGame.value = filteredGames.value[0]
    }
  } catch (error) {
    console.error('Failed to load games:', error)
  } finally {
    loading.value = false
  }
}

// Handle keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // Don't trigger if typing in an input
  if (document.activeElement?.tagName === 'INPUT') return
  
  // S key to open settings
  if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    openSettings()
  }
  
  // Enter to open game details
  if (e.key === 'Enter') {
    const focusedGame = filteredGames.value[focusedIndex.value]
    if (focusedGame) {
      e.preventDefault()
      openGameDetails(focusedGame)
    }
  }
}

// Watch for filter changes
watch(filteredGames, () => {
  setTimeout(updateFocusables, 100)
  
  // Reset focus to first game
  focusedIndex.value = 0
  
  // Update selected game
  if (filteredGames.value.length > 0) {
    selectedGame.value = filteredGames.value[0]
  } else {
    selectedGame.value = null
  }
}, { immediate: true })

// Watch for focused game changes (from gamepad/keyboard navigation)
watch(focusedIndex, (newIndex) => {
  if (filteredGames.value[newIndex]) {
    selectedGame.value = filteredGames.value[newIndex]
  }
})

onMounted(() => {
  loadGames()
  updateGridColumns()
  
  window.addEventListener('resize', updateGridColumns)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGridColumns)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/* Custom transition duration */
.duration-600 {
  transition-duration: 600ms;
}

/* Blur effect when settings open (applied from parent) */
.view-back {
  opacity: 0.3;
  transform: scale(0.92) translateZ(0);
  filter: grayscale(0.8) blur(8px);
  pointer-events: none;
}
</style>