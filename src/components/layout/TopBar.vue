<template>
  <header class="absolute top-0 left-0 right-0 z-50 px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- Left: Settings & Menu -->
      <div class="flex items-center gap-3">
        <IconButton title="Settings" @click="$emit('settings')">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
        </IconButton>
        
        <IconButton title="View Mode" @click="$emit('toggle-view')">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        </IconButton>
      </div>
      
      <!-- Center: Now Playing (optional) -->
      <div 
        v-if="nowPlaying"
        class="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm"
      >
        <div class="w-8 h-8 rounded-lg overflow-hidden bg-gray-700">
          <img 
            v-if="nowPlaying.coverUrl" 
            :src="nowPlaying.coverUrl" 
            class="w-full h-full object-cover"
          />
        </div>
        <div class="text-sm">
          <p class="text-white/50 text-xs">NOW PLAYING</p>
          <p class="text-white font-medium truncate max-w-[150px]">{{ nowPlaying.title }}</p>
        </div>
      </div>
      
      <!-- Right: Clock & Notifications -->
      <div class="flex items-center gap-4">
        <IconButton title="Notifications">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
        </IconButton>
        
        <span class="text-white/80 text-sm font-medium">
          {{ currentTime }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Game } from '@/types'
import { IconButton } from '@/components/ui'

defineProps<{
  nowPlaying?: Game | null
}>()

defineEmits<{
  settings: []
  'toggle-view': []
}>()

const currentTime = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

let interval: number

onMounted(() => {
  updateTime()
  interval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>
