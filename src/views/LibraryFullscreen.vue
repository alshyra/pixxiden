<template>
  <div class="fullscreen-view relative min-h-screen bg-black overflow-hidden">
    <BottomFilters
      :filters="filters"
      v-model="currentFilter"
    />

    <HeroBanner 
      :game="selectedGame"
      :metadata="selectedMetadataGame"
      @open-details="openGameDetails(selectedGame)"
    />
    <!-- Games Grid -->
    <div class="absolute bottom-14 left-0 right-0">
      <GameCarousel
        :games="filteredGames"
        :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id"
        @select="selectGame"
        @open="openGameDetails"
        >
      </GameCarousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useFocusNavigation } from '@/composables/useFocusNavigation'
import type { Game } from '@/types'
import Button from '@/components/ui/Button.vue'
import GameCarousel from '@/components/game/GameCarousel.vue'
import { HeroBanner } from '@/components/game'
import { BottomFilters } from '@/components/layout'

const router = useRouter()
const libraryStore = useLibraryStore()

// Injected state from App.vue
const isSettingsOpen = inject('isSettingsOpen', ref(false))

// Local state
const loading = ref(true)
const currentFilter = ref('all')
const gridColumns = ref(5)
const selectedGame = ref<Game | null>(null)
const playingGame = ref<Game | null>(null)
const selectedMetadataGame = ref(null)

// Filters
const filters = [
  { label: 'Tous', value: 'all' },
  { label: 'Installés', value: 'installed' },
  { label: 'Les + joués', value: 'most-played' },
  { label: 'Récents', value: 'recent' }
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

// Select a game on hover (on with gamepad focus)
function selectGame(game: Game) {
  selectedGame.value = game
}

// Open game details on click
function openGameDetails(game: Game | null) {
  const gameToOpen = game || selectedGame.value
  if (!gameToOpen) return
  router.push(`/game/${gameToOpen.id}`)
}

// Open settings
function openSettings() {
  router.push('/settings')
}

// Load games
async function loadGames() {
  loading.value = true
  try {
    await libraryStore.fetchGames()
  } catch (error) {
    console.error('Failed to load games:', error)
  } finally {
    loading.value = false
  }
}

// Handle keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // S key to open settings
  if (e.key === 's' || e.key === 'S') {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        openSettings()
      }
    }
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

// Watch for filter changes to update focusables
watch(filteredGames, () => {
  setTimeout(updateFocusables, 100)
  focusedIndex.value = 0
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
.library-view {
  min-height: 100vh;
  background: #050505;
  padding-bottom: 80px; /* Space for footer */
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.library-view.view-back {
  opacity: 0.3;
  transform: scale(0.92) translateZ(0);
  filter: grayscale(0.8) blur(8px);
  pointer-events: none;
}

/* Header */
.library-header {
  padding: 3rem 5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.subtitle {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.main-title {
  font-size: 3rem;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.05em;
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

/* Filter pills */
.filter-pills {
  display: flex;
  gap: 0.5rem;
}

.filter-pill {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
}

.filter-pill:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.filter-pill.active {
  color: white;
  background: rgba(94, 92, 230, 0.2);
  border-color: rgba(94, 92, 230, 0.5);
  box-shadow: 0 0 15px rgba(94, 92, 230, 0.3);
}

/* Settings trigger */
.settings-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.settings-trigger:hover {
  color: white;
  border-color: rgba(94, 92, 230, 0.5);
  background: rgba(94, 92, 230, 0.15);
  box-shadow: 0 0 20px rgba(94, 92, 230, 0.3);
}

/* Games grid */
.games-container {
  padding: 0 5rem 2rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 5), 1fr);
  gap: 1.5rem;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.5rem;
  max-width: 300px;
}

.sync-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #5e5ce6;
  color: white;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(94, 92, 230, 0.4);
}

.sync-button:hover {
  background: #7c7ae8;
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.5);
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.loader {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #5e5ce6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Game count */
.game-count {
  position: fixed;
  bottom: 80px;
  right: 2rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
}

/* Responsive */
@media (max-width: 1024px) {
  .library-header {
    padding: 2rem 2rem 1.5rem;
  }
  
  .main-title {
    font-size: 2.5rem;
  }
  
  .games-container {
    padding: 0 2rem 2rem;
  }
  
  .filter-pills {
    display: none;
  }
}

@media (max-width: 768px) {
  .library-header {
    padding: 1.5rem 1rem 1rem;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .games-container {
    padding: 0 1rem 2rem;
  }
  
  .games-grid {
    gap: 1rem;
  }
  
  .settings-trigger span {
    display: none;
  }
}
</style>
