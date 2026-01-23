<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div 
        v-if="isVisible"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
        @click.self="hide"
      >
        <!-- Overlay Content -->
        <div class="bg-gray-900/95 rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 border border-white/10">
          
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
              <img 
                v-if="currentGame?.backgroundUrl"
                :src="currentGame.backgroundUrl" 
                class="w-16 h-16 rounded-lg object-cover"
              />
              <div v-else class="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center">
                <span class="text-2xl">🎮</span>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">
                  {{ currentGame?.title || 'Game' }}
                </h2>
                <p class="text-sm text-white/60">
                  Playing for {{ formatPlayTime(sessionTime) }}
                </p>
              </div>
            </div>
            
            <Button 
              variant="ghost"
              size="sm"
              class="p-2"
              @click="hide"
            >
              <template #icon>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </template>
            </Button>
          </div>
          
          <!-- Actions Grid -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Resume Game -->
            <Button 
              ref="resumeButton"
              variant="primary"
              size="lg"
              class="p-6 bg-green-600 hover:bg-green-500 flex-col gap-3"
              @click="resumeGame"
            >
              <template #icon>
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                </svg>
              </template>
              <span class="font-semibold text-white">Resume Game</span>
              <span class="text-xs text-white/70">Press B or Guide</span>
            </Button>
            
            <!-- Achievements (placeholder) -->
            <button 
              @click="showAchievements"
              class="p-6 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors flex flex-col items-center gap-3 focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <svg class="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd"/>
              </svg>
              <span class="font-semibold text-white">Achievements</span>
              <span class="text-xs text-white/60">Coming soon</span>
            </button>
            
            <!-- Screenshot (placeholder) -->
            <button 
              @click="takeScreenshot"
              class="p-6 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors flex flex-col items-center gap-3 focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
              </svg>
              <span class="font-semibold text-white">Screenshot</span>
              <span class="text-xs text-white/60">Coming soon</span>
            </button>
            
            <!-- Quit Game -->
            <Button 
              variant="danger"
              size="lg"
              class="p-6 flex-col gap-3"
              @click="quitGame"
            >
              <template #icon>
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
              </template>
              <span class="font-semibold">Quit Game</span>
            </Button>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
            <div class="text-center">
              <p class="text-2xl font-bold text-green-400">{{ sessionTime > 0 ? Math.round(sessionTime / 60) : '—' }}</p>
              <p class="text-xs text-white/60">Session (min)</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-white">{{ totalPlayTime }}</p>
              <p class="text-xs text-white/60">Total Time</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-yellow-400">{{ achievements }}</p>
              <p class="text-xs text-white/60">Achievements</p>
            </div>
          </div>
          
          <!-- Hint -->
          <p class="text-center text-white/40 text-sm mt-4">
            Press <kbd class="px-2 py-1 bg-gray-800 rounded text-white/60">Guide</kbd> or <kbd class="px-2 py-1 bg-gray-800 rounded text-white/60">B</kbd> to return to game
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import type { Game } from '@/types'

const isVisible = ref(false)
const currentGame = ref<Game | null>(null)
const sessionTime = ref(0) // seconds
const sessionStartTime = ref<number | null>(null)

const resumeButton = ref<HTMLButtonElement | null>(null)

// Placeholder values
const totalPlayTime = ref('2h 30m')
const achievements = ref('—')

let sessionInterval: ReturnType<typeof setInterval> | undefined
let unlistenToggle: UnlistenFn | undefined

// Session timer
watch(isVisible, (visible) => {
  if (visible) {
    // Focus resume button for gamepad navigation
    nextTick(() => {
      resumeButton.value?.focus()
    })
  }
})

function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function hide() {
  isVisible.value = false
}

function resumeGame() {
  hide()
}

function showAchievements() {
  // TODO: Implement achievements view
  console.log('Show achievements')
}

function takeScreenshot() {
  // TODO: Implement screenshot
  console.log('Take screenshot')
}

async function quitGame() {
  if (confirm('Are you sure you want to quit the game?')) {
    // TODO: Implement game process killing
    console.log('Quit game')
    hide()
  }
}

// Set the current playing game (called from parent)
function setCurrentGame(game: Game | null) {
  currentGame.value = game
  if (game) {
    sessionStartTime.value = Date.now()
    sessionTime.value = 0
    
    // Start session timer
    sessionInterval = setInterval(() => {
      if (sessionStartTime.value) {
        sessionTime.value = Math.floor((Date.now() - sessionStartTime.value) / 1000)
      }
    }, 1000)
  } else {
    clearInterval(sessionInterval)
    sessionStartTime.value = null
    sessionTime.value = 0
  }
}

// Expose methods for parent component
defineExpose({
  setCurrentGame,
  show: () => { isVisible.value = true },
  hide,
})

onMounted(async () => {
  // Start gamepad monitoring
  try {
    await invoke('start_gamepad_monitoring')
    console.log('🎮 Gamepad monitoring started')
  } catch (error) {
    console.error('Failed to start gamepad monitoring:', error)
  }
  
  // Listen for overlay toggle events
  unlistenToggle = await listen('gamepad-overlay-toggle', () => {
    console.log('🎮 Overlay toggle received')
    isVisible.value = !isVisible.value
  })
})

onUnmounted(async () => {
  unlistenToggle?.()
  clearInterval(sessionInterval)
  
  try {
    await invoke('stop_gamepad_monitoring')
  } catch (error) {
    console.error('Failed to stop gamepad monitoring:', error)
  }
})
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
