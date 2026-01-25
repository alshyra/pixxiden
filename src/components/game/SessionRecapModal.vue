<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-lg"
        @click.self="close"
      >
        <!-- Modal Content -->
        <div 
          ref="modalRef"
          class="bg-[#0f0f12]/98 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-white/10 overflow-hidden"
          @keydown="handleKeydown"
        >
          <!-- Header with Game Info -->
          <div class="relative h-32 bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-cyan-900/20">
            <img 
              v-if="game?.backgroundUrl"
              :src="game.backgroundUrl" 
              class="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f0f12] to-transparent"></div>
            
            <!-- Title Overlay -->
            <div class="absolute bottom-4 left-6 right-6">
              <h2 class="text-2xl font-black italic text-white tracking-tight">
                Session terminée
              </h2>
              <p class="text-sm text-white/60">
                {{ game?.title || 'Jeu' }}
              </p>
            </div>
          </div>
          
          <!-- Session Stats -->
          <div class="p-6 space-y-6">
            <!-- Main Stats Grid -->
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-[#1a1a1e] rounded-xl p-4 text-center border border-white/5">
                <p class="text-3xl font-black text-green-400 mb-1">
                  {{ formatSessionTime(sessionDuration) }}
                </p>
                <p class="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Durée session
                </p>
              </div>
              
              <div class="bg-[#1a1a1e] rounded-xl p-4 text-center border border-white/5">
                <p class="text-3xl font-black text-[#5e5ce6] mb-1">
                  {{ game?.playTimeMinutes ? formatTotalTime(game.playTimeMinutes + Math.floor(sessionDuration / 60)) : 'N/A' }}
                </p>
                <p class="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Temps total
                </p>
              </div>
              
              <div class="bg-[#1a1a1e] rounded-xl p-4 text-center border border-white/5">
                <p class="text-3xl font-black text-yellow-400 mb-1">
                  {{ game?.achievementsUnlocked !== undefined ? game.achievementsUnlocked : 'N/A' }}
                </p>
                <p class="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Succès
                </p>
              </div>
            </div>
            
            <!-- Session Info -->
            <div class="bg-[#1a1a1e]/50 rounded-xl p-4 border border-white/5">
              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-sm text-white/50">Début de session</span>
                <span class="text-sm font-semibold text-white">{{ formatDateTime(sessionStartTime) }}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-white/5">
                <span class="text-sm text-white/50">Fin de session</span>
                <span class="text-sm font-semibold text-white">{{ formatDateTime(sessionEndTime) }}</span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-sm text-white/50">Store</span>
                <span class="text-sm font-semibold text-white">{{ getStoreName(game?.store) }}</span>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-4">
              <button
                ref="playAgainBtn"
                @click="playAgain"
                class="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white transition-colors focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#0f0f12] focus:outline-none"
                :class="{ 'ring-2 ring-green-400 ring-offset-2 ring-offset-[#0f0f12]': focusedButton === 'playAgain' }"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                </svg>
                <span>Rejouer</span>
              </button>
              
              <button
                ref="closeBtn"
                @click="close"
                class="flex items-center justify-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-[#0f0f12] focus:outline-none"
                :class="{ 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#0f0f12]': focusedButton === 'close' }"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Retour à la bibliothèque</span>
              </button>
            </div>
            
            <!-- Controller Hint -->
            <p class="text-center text-white/30 text-xs">
              <kbd class="px-2 py-1 bg-[#1a1a1e] rounded text-white/50 mr-1">A</kbd> Sélectionner
              <span class="mx-2">•</span>
              <kbd class="px-2 py-1 bg-[#1a1a1e] rounded text-white/50 mr-1">←/→</kbd> Naviguer
              <span class="mx-2">•</span>
              <kbd class="px-2 py-1 bg-[#1a1a1e] rounded text-white/50 mr-1">B</kbd> Fermer
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGamepad } from '@/composables/useGamepad'
import type { Game } from '@/types'

interface Props {
  isOpen: boolean
  game: Game | null | undefined
  sessionDuration: number // in seconds
  sessionStartTime: Date | null
  sessionEndTime: Date | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  playAgain: [gameId: string]
}>()

const { on: onGamepad } = useGamepad()

const playAgainBtn = ref<HTMLButtonElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)

const focusedButton = ref<'playAgain' | 'close'>('playAgain')

// Focus management when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    focusedButton.value = 'playAgain'
    await nextTick()
    playAgainBtn.value?.focus()
  }
})

// Handle keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      event.preventDefault()
      toggleFocus()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (focusedButton.value === 'playAgain') {
        playAgain()
      } else {
        close()
      }
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
  }
}

function toggleFocus() {
  if (focusedButton.value === 'playAgain') {
    focusedButton.value = 'close'
    closeBtn.value?.focus()
  } else {
    focusedButton.value = 'playAgain'
    playAgainBtn.value?.focus()
  }
}

// Gamepad navigation
onGamepad('navigate', (direction: string) => {
  if (!props.isOpen) return
  if (direction === 'left' || direction === 'right') {
    toggleFocus()
  }
})

onGamepad('confirm', () => {
  if (!props.isOpen) return
  if (focusedButton.value === 'playAgain') {
    playAgain()
  } else {
    close()
  }
})

onGamepad('back', () => {
  if (!props.isOpen) return
  close()
})

function close() {
  emit('close')
}

function playAgain() {
  if (props.game?.id) {
    emit('playAgain', props.game.id)
  }
  close()
}

// Format helpers
function formatSessionTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatTotalTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`
  }
  return hours > 0 ? `${hours}h` : `${mins}m`
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'N/A'
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function getStoreName(store: string | undefined): string {
  if (!store) return 'N/A'
  const names: Record<string, string> = {
    epic: 'Epic Games',
    gog: 'GOG Galaxy',
    amazon: 'Amazon Games',
    steam: 'Steam'
  }
  return names[store] || store
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
