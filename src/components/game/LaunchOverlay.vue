<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 border border-white/10">
          <!-- Loader -->
          <div class="flex flex-col items-center gap-6">
            <!-- Spinner (when launching) -->
            <div v-if="!error" class="relative w-20 h-20">
              <!-- Outer ring -->
              <div class="absolute inset-0 border-4 border-green-500/20 rounded-full"></div>
              <!-- Spinning ring -->
              <div class="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin">
              </div>
              <!-- Game icon placeholder -->
              <div class="absolute inset-3 bg-gray-800 rounded-full flex items-center justify-center">
                <Play class="w-8 h-8 text-green-500" />
              </div>
            </div>

            <!-- Error Icon -->
            <div v-else class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle class="w-10 h-10 text-red-500" />
            </div>

            <!-- Game Info -->
            <div class="text-center">
              <h3 class="text-xl font-bold text-white mb-2">
                {{ error ? 'Launch Failed' : 'Launching Game' }}
              </h3>
              <p class="text-lg text-white/80">
                {{ gameTitle }}
              </p>
              <p v-if="runner && !error" class="text-sm text-white/60 mt-1">
                Using {{ runner }}
              </p>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="w-full p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p class="text-sm text-red-400 text-center">{{ error }}</p>
            </div>

            <!-- Progress Text -->
            <p v-if="!error" class="text-sm text-white/60 animate-pulse">
              {{ progressText }}
            </p>

            <!-- Progress bar (optional, aesthetic) -->
            <div v-if="!error" class="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full bg-green-500 rounded-full transition-all duration-1000"
                :style="{ width: `${progress}%` }"></div>
            </div>

            <!-- Close Button (only on error) -->
            <Button v-if="error" variant="ghost" class="!bg-white/10 hover:!bg-white/20" @click="close">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { Button } from '@/components/ui'
import { Play, AlertCircle } from 'lucide-vue-next'

interface Props {
  isVisible: boolean
  gameTitle: string
  runner?: string
  error?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  launched: []
}>()

const progressTexts = [
  'Initializing...',
  'Starting runner...',
  'Loading game files...',
  'Preparing environment...',
  'Almost there...'
]

const progressText = ref(progressTexts[0])
const progress = ref(0)

let textInterval: ReturnType<typeof setInterval> | undefined
let progressInterval: ReturnType<typeof setInterval> | undefined
let textIndex = 0

// Listen to Tauri events
let unlistenLaunched: UnlistenFn | null = null
let unlistenFailed: UnlistenFn | null = null

onMounted(async () => {
  // Listen for successful game launch
  unlistenLaunched = await listen('game-launched', (event) => {
    console.log('Game launched event:', event)
    emit('launched')
  })

  // Listen for launch failures
  unlistenFailed = await listen('game-launch-failed', (event: any) => {
    console.error('Game launch failed event:', event)
    // Error is handled via props
  })
})

// Cycle through progress texts and update progress bar
watch(() => props.isVisible, (visible) => {
  if (visible && !props.error) {
    textIndex = 0
    progress.value = 0

    // Text cycling
    textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % progressTexts.length
      progressText.value = progressTexts[textIndex]
    }, 1500)

    // Progress bar animation
    progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += Math.random() * 15
        if (progress.value > 90) progress.value = 90
      }
    }, 500)
  } else {
    clearInterval(textInterval)
    clearInterval(progressInterval)
    textIndex = 0
    progressText.value = progressTexts[0]
    progress.value = 0
  }
}, { immediate: true })

// Reset on error
watch(() => props.error, (error) => {
  if (error) {
    clearInterval(textInterval)
    clearInterval(progressInterval)
  }
})

onUnmounted(() => {
  clearInterval(textInterval)
  clearInterval(progressInterval)
  if (unlistenLaunched) unlistenLaunched()
  if (unlistenFailed) unlistenFailed()
})

function close() {
  emit('close')
}
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
