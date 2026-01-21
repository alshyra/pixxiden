<template>
  <div 
    class="game-card group relative cursor-pointer transition-all duration-300"
    :class="{ 
      'ring-2 ring-white ring-offset-2 ring-offset-black scale-105': selected,
      'hover:scale-105': !selected
    }"
    @click="$emit('click')"
  >
    <!-- Cover Image -->
    <div class="aspect-[3/4] rounded-xl overflow-hidden bg-gray-800">
      <img 
        v-if="game.coverUrl"
        :src="game.coverUrl"
        :alt="game.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div 
        v-else 
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900"
      >
        <span class="text-4xl">🎮</span>
      </div>
      
      <!-- Hover Overlay -->
      <div 
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
               opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      
      <!-- Title on hover -->
      <div 
        class="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0
               group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
      >
        <h3 class="text-white font-semibold text-sm truncate">{{ game.title }}</h3>
      </div>
    </div>
    
    <!-- Installed indicator -->
    <div 
      v-if="game.installed"
      class="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg"
      title="Installed"
    />
    
    <!-- Now Playing indicator -->
    <div 
      v-if="playing"
      class="absolute top-2 left-2 px-2 py-1 bg-green-500 rounded text-xs font-semibold text-white"
    >
      Playing
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Game } from '@/types'

defineProps<{
  game: Game
  selected?: boolean
  playing?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.game-card {
  transform-origin: center center;
}
</style>
