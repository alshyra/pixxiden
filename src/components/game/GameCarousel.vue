<template>
  <div class="game-carousel relative">
    <!-- Carousel Container -->
    <div 
      ref="carouselRef"
      class="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-6 scroll-smooth"
      @scroll="updateScrollState"
      @wheel="handleWheel"
    >
      <GameCard
        v-for="(game, index) in games"
        :key="game.id"
        :ref="el => setCardRef(index, el)"
        :game="game"
        :selected="selectedId === game.id"
        :playing="playingId === game.id"
        class="flex-shrink-0 w-36 md:w-44"
        @mouseenter="emit('select', game)"
        @click="emit('open', game)"
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
import { ref, onMounted, watch, nextTick } from 'vue'
import type { Game } from '@/types'
import GameCard from './GameCard.vue'

const props = defineProps<{
  games: Game[]
  selectedId?: string
  playingId?: string
  autoScrollOnSelect?: boolean // Only scroll on keyboard/gamepad navigation
}>()

const emit = defineEmits<{
  select: [game: Game]
  open: [game: Game]
}>()

const carouselRef = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

// Store card element refs for scroll-into-view
const cardRefs = ref<Map<number, HTMLElement>>(new Map())

function setCardRef(index: number, el: any) {
  if (el?.$el) {
    cardRefs.value.set(index, el.$el)
  } else if (el instanceof HTMLElement) {
    cardRefs.value.set(index, el)
  }
}

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

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  // Augmente la vitesse du scroll (multiplie par 2)
  carouselRef.value?.scrollBy({ left: e.deltaY * 2, behavior: 'auto' })
}

// Scroll selected item into view
function scrollToSelected() {
  if (!props.selectedId || !carouselRef.value) return
  
  const selectedIndex = props.games.findIndex(g => g.id === props.selectedId)
  if (selectedIndex === -1) return
  
  const cardEl = cardRefs.value.get(selectedIndex)
  if (cardEl) {
    cardEl.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
}

// Expose scrollToSelected for external calls (keyboard/gamepad)
defineExpose({ scrollToSelected })

// Watch for selection changes (only scroll if autoScrollOnSelect is true)
watch(() => props.selectedId, () => {
  if (props.autoScrollOnSelect) {
    nextTick(() => {
      scrollToSelected()
    })
  }
})

onMounted(() => {
  updateScrollState()
  // Initial scroll to selected only if autoScrollOnSelect
  if (props.autoScrollOnSelect) {
    nextTick(() => scrollToSelected())
  }
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
