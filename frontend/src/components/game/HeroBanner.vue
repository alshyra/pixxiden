<template>
  <div class="hero-banner relative w-full h-[60vh] overflow-hidden">
    <!-- Background Image with Blur -->
    <div class="absolute inset-0">
      <img 
        v-if="game?.coverUrl"
        :src="game.coverUrl"
        :alt="game.title"
        class="w-full h-full object-cover scale-110 blur-sm"
      />
      <div 
        v-else 
        class="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900"
      />
      <!-- Gradient Overlays -->
      <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
    </div>
    
    <!-- Content -->
    <div class="relative h-full flex items-end pb-8 px-12">
      <div class="max-w-2xl space-y-4">
        <!-- Game Title -->
        <h1 class="text-5xl md:text-6xl font-bold text-white tracking-tight">
          {{ game?.title || 'Select a Game' }}
        </h1>
        
        <!-- Meta Info -->
        <div v-if="game" class="flex items-center gap-3 text-sm">
          <Badge variant="outline">PC (Windows)</Badge>
          <img 
            v-if="storeIcon" 
            :src="storeIcon" 
            class="w-5 h-5" 
            :alt="game.storeId"
          />
          <Badge v-if="releaseYear" variant="outline">{{ releaseYear }}</Badge>
          <Badge v-if="metacritic" variant="success">{{ metacritic }}</Badge>
        </div>
        
        <!-- Genres -->
        <p v-if="genres" class="text-white/60 text-lg">
          {{ genres }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '@/types'
import { Badge } from '@/components/ui'

const props = defineProps<{
  game: Game | null
  metadata?: {
    releaseDate?: string
    genres?: string[]
    metacritic?: number
  }
}>()

const releaseYear = computed(() => {
  if (props.metadata?.releaseDate) {
    return new Date(props.metadata.releaseDate).getFullYear()
  }
  return null
})

const metacritic = computed(() => props.metadata?.metacritic || null)

const genres = computed(() => {
  if (props.metadata?.genres?.length) {
    return props.metadata.genres.slice(0, 3).join(' | ')
  }
  return null
})

const storeIcon = computed(() => {
  const icons: Record<string, string> = {
    epic: '/icons/epic.svg',
    gog: '/icons/gog.svg',
    amazon: '/icons/amazon.svg',
    steam: '/icons/steam.svg'
  }
  return props.game?.storeId ? icons[props.game.storeId] : null
})
</script>
