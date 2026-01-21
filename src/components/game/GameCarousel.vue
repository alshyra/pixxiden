<template>
  <div class="game-carousel relative">
    <!-- Carousel Container -->
    <div 
      ref="carouselRef"
      class="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-4 scroll-smooth"
      @scroll="updateScrollState"
    >
      <GameCard
        v-for="game in games"
        :key="game.id"
        :game="game"
        :selected="selectedId === game.id"
        :playing="playingId === game.id"
        class="flex-shrink-0 w-36 md:w-44"
        @click="$emit('select', game)"
      />
    </div>
    
    <!-- Navigation Arrows -->
    <button 
      v-if="canScrollLeft"
      class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 
             bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center
             text-white transition-all"
      @click="scrollLeft"
    >
      ‹
    </button>
    
    <button 
      v-if="canScrollRight"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 
             bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center
             text-white transition-all"
      @click="scrollRight"
    >
      ›
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Game } from '@/types'
import GameCard from './GameCard.vue'

defineProps<{
  games: Game[]
  selectedId?: string
  playingId?: string
}>()

defineEmits<{
  select: [game: Game]
}>()

const carouselRef = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

function updateScrollState() {
  if (!carouselRef.value) return
  const { scrollLeft, scrollWidth, clientWidth } = carouselRef.value
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 10
}

function scrollLeft() {
  carouselRef.value?.scrollBy({ left: -400, behavior: 'smooth' })
}

function scrollRight() {
  carouselRef.value?.scrollBy({ left: 400, behavior: 'smooth' })
}

onMounted(() => {
  updateScrollState()
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
