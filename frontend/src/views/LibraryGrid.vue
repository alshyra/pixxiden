<template>
  <div class="grid-view min-h-screen bg-black p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <button 
          class="p-2 hover:bg-white/10 rounded-lg transition-colors"
          @click="$router.push('/')"
        >
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-white">Library</h1>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Filter count -->
        <span class="text-white/60 text-sm">
          {{ filteredGames.length }} games
        </span>
        
        <!-- Sync button -->
        <Button variant="primary" size="sm" :disabled="syncing" @click="syncLibrary">
          <template #icon>
            <svg :class="['w-4 h-4', { 'animate-spin': syncing }]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
          </template>
          Sync
        </Button>
      </div>
    </div>
    
    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button 
        v-for="filter in filters"
        :key="filter.id"
        class="px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all"
        :class="currentFilter === filter.id 
          ? 'bg-indigo-600 text-white' 
          : 'bg-white/10 text-white/70 hover:bg-white/20'"
        @click="currentFilter = filter.id"
      >
        {{ filter.label }}
      </button>
    </div>
    
    <!-- Games Grid -->
    <div 
      v-if="!loading && filteredGames.length > 0"
      class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
    >
      <GameCard
        v-for="game in filteredGames"
        :key="game.id"
        :game="game"
        @click="openGame(game)"
      />
    </div>
    
    <!-- Empty State -->
    <div 
      v-else-if="!loading && filteredGames.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <span class="text-6xl mb-4">🎮</span>
      <p class="text-xl text-white/60">No games found</p>
      <p class="text-sm text-white/40 mt-2">Try syncing your library</p>
    </div>
    
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { GameCard } from '@/components/game'
import { Button } from '@/components/ui'
import type { Game } from '@/types'

const router = useRouter()
const libraryStore = useLibraryStore()

const loading = ref(true)
const syncing = ref(false)
const currentFilter = ref('all')

const filters = [
  { id: 'all', label: 'All Games' },
  { id: 'installed', label: 'Installed' },
  { id: 'epic', label: 'Epic Games' },
  { id: 'gog', label: 'GOG' },
  { id: 'amazon', label: 'Amazon' }
]

const filteredGames = computed(() => {
  let games = [...libraryStore.games]
  
  switch (currentFilter.value) {
    case 'installed':
      games = games.filter(g => g.installed)
      break
    case 'epic':
    case 'gog':
    case 'amazon':
      games = games.filter(g => g.storeId === currentFilter.value)
      break
  }
  
  return games.sort((a, b) => a.title.localeCompare(b.title))
})

function openGame(game: Game) {
  router.push(`/game/${game.id}`)
}

async function syncLibrary() {
  syncing.value = true
  try {
    await libraryStore.syncLibrary()
    await libraryStore.fetchGames()
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  try {
    await libraryStore.fetchGames()
  } finally {
    loading.value = false
  }
})
</script>
