<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div 
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div class="bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-lg w-full mx-4 border border-white/10">
          <!-- Download Progress -->
          <div class="flex flex-col items-center gap-6">
            <!-- Icon -->
            <div class="relative w-20 h-20">
              <template v-if="!error">
                <!-- Download icon with animation -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                      class="animate-bounce-slow"/>
                  </svg>
                </div>
                <!-- Circular progress -->
                <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    class="text-gray-700" 
                    stroke-width="8" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="42" 
                    cx="50" 
                    cy="50"
                  />
                  <circle 
                    class="text-blue-500 transition-all duration-500" 
                    stroke-width="8" 
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="circumference - (progress / 100) * circumference"
                    stroke-linecap="round"
                    stroke="currentColor" 
                    fill="transparent" 
                    r="42" 
                    cx="50" 
                    cy="50"
                  />
                </svg>
              </template>
              
              <!-- Error Icon -->
              <div 
                v-else 
                class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <!-- Game Info -->
            <div class="text-center">
              <h3 class="text-xl font-bold text-white mb-2">
                {{ error ? 'Download Failed' : 'Downloading' }}
              </h3>
              <p class="text-lg text-white/80">
                {{ gameTitle }}
              </p>
              <p v-if="runner && !error" class="text-sm text-white/60 mt-1">
                via {{ runner }}
              </p>
            </div>
            
            <!-- Progress Info (when downloading) -->
            <div v-if="!error" class="w-full space-y-3">
              <!-- Progress percentage -->
              <div class="flex justify-between items-center text-sm">
                <span class="text-white/60">Progress</span>
                <span class="text-white font-medium">{{ progress.toFixed(1) }}%</span>
              </div>
              
              <!-- Progress bar -->
              <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
                  :style="{ width: `${progress}%` }"
                ></div>
              </div>
              
              <!-- Download stats -->
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="flex justify-between">
                  <span class="text-white/40">Downloaded</span>
                  <span class="text-white/80">{{ downloaded }} / {{ total }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/40">Speed</span>
                  <span class="text-white/80">{{ speed }}</span>
                </div>
              </div>
              
              <!-- ETA -->
              <div class="flex justify-between text-sm">
                <span class="text-white/40">Time remaining</span>
                <span class="text-white/80">{{ eta }}</span>
              </div>
            </div>
            
            <!-- Error Message -->
            <div 
              v-if="error" 
              class="w-full p-4 bg-red-500/10 rounded-lg border border-red-500/20"
            >
              <p class="text-sm text-red-400 text-center">{{ error }}</p>
            </div>
            
            <!-- Status text -->
            <p v-if="!error && progress < 100" class="text-sm text-white/60">
              {{ statusText }}
            </p>
            <p v-else-if="!error && progress >= 100" class="text-sm text-green-400">
              Download complete! Installing...
            </p>
            
            <!-- Close/Cancel Button -->
            <div class="flex gap-3">
              <button 
                v-if="error"
                @click="close"
                class="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium text-white transition-colors"
              >
                Close
              </button>
              <button 
                v-if="!error"
                @click="cancel"
                class="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  isVisible: boolean
  gameTitle: string
  runner?: string
  error?: string | null
  progress?: number
  downloaded?: string
  total?: string
  speed?: string
  eta?: string
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  downloaded: '0 MB',
  total: '0 MB',
  speed: 'Calculating...',
  eta: 'Calculating...'
})

const emit = defineEmits<{
  close: []
  cancel: []
}>()

const circumference = 2 * Math.PI * 42

// Status text that changes
const statusTexts = [
  'Fetching game files...',
  'Verifying checksums...',
  'Downloading assets...',
  'Please wait...'
]
const statusIndex = ref(0)
const statusText = computed(() => statusTexts[statusIndex.value])

let statusInterval: ReturnType<typeof setInterval> | undefined

watch(() => props.isVisible, (visible) => {
  if (visible && !props.error) {
    statusInterval = setInterval(() => {
      statusIndex.value = (statusIndex.value + 1) % statusTexts.length
    }, 3000)
  } else {
    clearInterval(statusInterval)
    statusIndex.value = 0
  }
}, { immediate: true })

function close() {
  emit('close')
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(-10%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(10%);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 1.5s infinite;
}
</style>
