<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div 
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      >
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-10 shadow-2xl max-w-2xl w-full mx-4 border border-white/20 relative overflow-hidden">
          <!-- Animated background gradient -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse"></div>
          
          <!-- Content -->
          <div class="relative z-10 flex flex-col items-center gap-8">
            <!-- Icon with enhanced animation -->
            <div class="relative w-32 h-32">
              <template v-if="!error">
                <!-- Download icon with animation -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                      class="animate-bounce-slow"/>
                  </svg>
                </div>
                <!-- Circular progress ring -->
                <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    class="text-gray-700" 
                    stroke-width="6" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="44" 
                    cx="50" 
                    cy="50"
                  />
                  <circle 
                    class="text-blue-500 transition-all duration-500 drop-shadow-glow" 
                    stroke-width="6" 
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="circumference - (progress / 100) * circumference"
                    stroke-linecap="round"
                    stroke="currentColor" 
                    fill="transparent" 
                    r="44" 
                    cx="50" 
                    cy="50"
                  />
                </svg>
                <!-- Progress percentage in center -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-2xl font-bold text-white">{{ progress.toFixed(0) }}%</span>
                </div>
              </template>
              
              <!-- Error Icon -->
              <div 
                v-else 
                class="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500/30"
              >
                <svg class="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <!-- Game Info -->
            <div class="text-center space-y-2">
              <h3 class="text-3xl font-black text-white tracking-tight uppercase">
                {{ error ? 'Download Failed' : 'Downloading Game' }}
              </h3>
              <p class="text-xl text-white/90 font-medium">
                {{ gameTitle }}
              </p>
              <p v-if="runner && !error" class="text-sm text-white/50 mt-1">
                Using {{ runner }}
              </p>
            </div>
            
            <!-- Progress Info (when downloading) -->
            <div v-if="!error" class="w-full space-y-5">
              <!-- Progress bar with glow effect -->
              <div class="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
                <div 
                  class="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-300 shadow-lg"
                  :style="{ width: `${progress}%` }"
                ></div>
              </div>
              
              <!-- Download stats grid -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div class="text-xs text-white/40 uppercase tracking-wide mb-1">Downloaded</div>
                  <div class="text-lg font-bold text-white">{{ downloaded }}</div>
                  <div class="text-xs text-white/50">of {{ total }}</div>
                </div>
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div class="text-xs text-white/40 uppercase tracking-wide mb-1">Speed</div>
                  <div class="text-lg font-bold text-blue-400">{{ speed }}</div>
                </div>
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div class="text-xs text-white/40 uppercase tracking-wide mb-1">ETA</div>
                  <div class="text-lg font-bold text-white">{{ eta }}</div>
                </div>
              </div>
            </div>
            
            <!-- Error Message -->
            <div 
              v-if="error" 
              class="w-full p-5 bg-red-500/10 rounded-xl border border-red-500/30"
            >
              <p class="text-sm text-red-300 text-center leading-relaxed">{{ error }}</p>
            </div>
            
            <!-- Status text with animation -->
            <div v-if="!error && progress < 100" class="text-center">
              <p class="text-sm text-white/60 animate-pulse">
                {{ statusText }}
              </p>
            </div>
            <div v-else-if="!error && progress >= 100" class="text-center">
              <p class="text-sm text-green-400 font-semibold flex items-center gap-2">
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Download complete! Installing...
              </p>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button 
                v-if="error"
                @click="close"
                class="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all border border-white/20 hover:border-white/30"
              >
                Close
              </button>
              <button 
                v-if="!error && progress < 100"
                @click="cancel"
                class="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl font-semibold transition-all border border-red-500/30 hover:border-red-500/50"
              >
                Cancel Download
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

const circumference = 2 * Math.PI * 44 // Updated to match radius of 44

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

.drop-shadow-glow {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
}
</style>
