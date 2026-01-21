<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '../stores/gameStore'

const props = defineProps<{
  games: Game[]
  selectedIndex: number
  isActive: boolean
}>()

// Calculer les jeux visibles (centré sur la sélection)
const visibleGames = computed(() => {
  const total = props.games.length
  if (total === 0) return []
  
  // Montrer 5 jeux à la fois (2 avant, sélectionné, 2 après)
  const result: { game: Game; offset: number; index: number }[] = []
  
  for (let i = -2; i <= 2; i++) {
    let idx = props.selectedIndex + i
    // Wrap around
    if (idx < 0) idx = total + idx
    if (idx >= total) idx = idx - total
    
    if (idx >= 0 && idx < total) {
      result.push({
        game: props.games[idx],
        offset: i,
        index: idx
      })
    }
  }
  
  return result
})

const selectedGame = computed(() => props.games[props.selectedIndex])
</script>

<template>
  <div class="carousel-container" :class="{ 'active': isActive }">
    <h2 class="text-2xl font-bold text-white mb-4 px-8">
      🎮 Jeux installés
      <span class="text-gray-400 text-lg font-normal ml-2">({{ games.length }})</span>
    </h2>
    
    <div class="carousel-wrapper">
      <div class="carousel-track">
        <div
          v-for="{ game, offset, index } in visibleGames"
          :key="game.id"
          class="carousel-item"
          :class="{
            'selected': offset === 0 && isActive,
            'adjacent': Math.abs(offset) === 1,
            'distant': Math.abs(offset) >= 2
          }"
          :style="{
            '--offset': offset,
            transform: `translateX(${offset * 220}px) scale(${offset === 0 ? 1.1 : (Math.abs(offset) === 1 ? 0.85 : 0.7)})`,
            opacity: offset === 0 ? 1 : (Math.abs(offset) === 1 ? 0.7 : 0.4),
            zIndex: 10 - Math.abs(offset)
          }"
        >
          <!-- Game Card -->
          <div class="game-card">
            <div class="game-cover">
              <img 
                v-if="game.cover_url" 
                :src="game.cover_url" 
                :alt="game.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="game-placeholder">
                <svg class="w-16 h-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <!-- Platform badge -->
            <div class="platform-badge" v-if="game.platform">
              {{ game.platform === 'steam' ? '🎮' : game.platform === 'gog' ? '🟣' : '🎯' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected game info -->
    <div v-if="selectedGame && isActive" class="selected-info">
      <h3 class="text-xl font-bold text-white">{{ selectedGame.title }}</h3>
      <p class="text-gray-400 text-sm">
        {{ selectedGame.platform?.toUpperCase() || 'Game' }}
        <span class="ml-2">• Appuyer sur Ⓐ pour lancer</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.carousel-container {
  @apply py-6 relative;
  transition: opacity 0.2s ease;
}

.carousel-container:not(.active) {
  opacity: 0.6;
}

.carousel-wrapper {
  @apply relative overflow-hidden;
  height: 280px;
}

.carousel-track {
  @apply flex items-center justify-center;
  height: 100%;
  position: relative;
}

.carousel-item {
  @apply absolute;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.game-card {
  @apply relative rounded-xl overflow-hidden shadow-2xl;
  width: 180px;
  height: 240px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
}

.selected .game-card {
  @apply ring-4 ring-blue-500 ring-opacity-80;
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
}

.game-cover {
  @apply w-full h-full;
}

.game-placeholder {
  @apply w-full h-full flex items-center justify-center;
  background: linear-gradient(145deg, #1f2937, #111827);
}

.platform-badge {
  @apply absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.selected-info {
  @apply text-center mt-6 px-8;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
