<template>
  <div 
    class="game-card group relative overflow-hidden rounded-xl bg-remix-bg-card 
           hover:bg-remix-bg-hover transition-all duration-300 cursor-pointer
           shadow-card hover:shadow-card-hover aspect-[3/4]"
    @click="$emit('select', game)"
    @contextmenu.prevent="showContextMenu">
    
    <!-- Cover Image -->
    <img 
      v-if="game.coverUrl"
      :src="game.coverUrl" 
      :alt="game.title"
      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
    />
    <div v-else class="w-full h-full flex items-center justify-center bg-gradient-card">
      <GamepadIcon class="w-20 h-20 text-remix-text-secondary opacity-50" />
    </div>
    
    <!-- Overlay on Hover -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      
      <!-- Game Info -->
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <h3 class="text-remix-text-primary font-display font-semibold text-lg mb-1 line-clamp-1">
          {{ game.title }}
        </h3>
        <p v-if="game.developer" class="text-remix-text-secondary text-sm line-clamp-1 mb-2">
          {{ game.developer }}
        </p>
        
        <!-- Store Badge -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="storeBadgeClass">
            {{ storeDisplayName }}
          </span>
          
          <!-- Play Time -->
          <span v-if="game.playTime > 0" class="text-xs text-remix-text-secondary">
            {{ formatPlayTime(game.playTime) }}
          </span>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="absolute top-2 right-2 flex gap-2">
        <button 
          v-if="!game.installed"
          @click.stop="$emit('install', game.id)"
          class="p-2 rounded-full bg-remix-accent hover:bg-remix-accent-hover
                 transition-colors shadow-lg"
          title="Install">
          <DownloadIcon class="w-5 h-5 text-white" />
        </button>
        <button 
          v-else
          @click.stop="$emit('play', game.id)"
          class="p-2 rounded-full bg-remix-success hover:bg-green-600
                 transition-colors shadow-lg"
          title="Play">
          <PlayIcon class="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
    
    <!-- Download Progress Bar -->
    <div v-if="game.downloading" 
         class="absolute bottom-0 left-0 right-0 h-1 bg-remix-bg-dark">
      <div 
        class="h-full bg-remix-accent transition-all duration-300 shadow-glow"
        :style="{ width: game.downloadProgress + '%' }">
      </div>
    </div>

    <!-- Installing Badge -->
    <div v-if="game.downloading" 
         class="absolute top-2 left-2 px-3 py-1 bg-remix-accent rounded-full text-xs font-medium shadow-lg">
      Installing {{ game.downloadProgress }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GamepadIcon, DownloadIcon, PlayIcon } from 'lucide-vue-next'
import type { Game } from '@/types'

interface Props {
  game: Game
}

const props = defineProps<Props>()
const emit = defineEmits(['select', 'install', 'play', 'contextmenu'])

const storeBadgeClass = computed(() => {
  const classes = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'
  switch (props.game.storeId) {
    case 'epic':
      return `${classes} bg-gray-700 text-white`
    case 'gog':
      return `${classes} bg-purple-700 text-white`
    case 'amazon':
      return `${classes} bg-orange-700 text-white`
    default:
      return `${classes} bg-remix-accent/20 text-remix-accent`
  }
})

const storeDisplayName = computed(() => {
  switch (props.game.storeId) {
    case 'epic':
      return 'Epic Games'
    case 'gog':
      return 'GOG'
    case 'amazon':
      return 'Amazon'
    default:
      return props.game.storeId
  }
})

function formatPlayTime(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`
  }
  return `${Math.floor(seconds / 3600)}h`
}

function showContextMenu(event: MouseEvent) {
  emit('contextmenu', { game: props.game, event })
}
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
</style>
