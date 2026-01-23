<template>
  <div class="downloads-view">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-display font-bold">Downloads</h1>
      <div class="flex items-center gap-4">
        <button 
          v-if="activeDownloads.length > 0"
          @click="pauseAll"
          class="flex items-center gap-2 px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors"
        >
          <PauseIcon class="w-4 h-4" />
          Pause All
        </button>
        <button 
          v-if="pausedDownloads.length > 0"
          @click="resumeAll"
          class="flex items-center gap-2 px-4 py-2 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg transition-colors"
        >
          <PlayIcon class="w-4 h-4" />
          Resume All
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="downloads.length === 0" class="text-center py-20">
      <DownloadCloudIcon class="w-20 h-20 text-remix-text-secondary mx-auto mb-6" />
      <h2 class="text-2xl font-semibold mb-2">No Downloads</h2>
      <p class="text-remix-text-secondary max-w-md mx-auto">
        Your download queue is empty. Install games from your library to see them here.
      </p>
      <router-link 
        to="/" 
        class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg transition-colors"
      >
        <GamepadIcon class="w-5 h-5" />
        Browse Library
      </router-link>
    </div>

    <!-- Downloads list -->
    <div v-else class="space-y-4">
      <!-- Active downloads -->
      <div v-if="activeDownloads.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-remix-text-secondary mb-4">Downloading</h2>
        <div class="space-y-3">
          <div 
            v-for="download in activeDownloads" 
            :key="download.id"
            class="bg-remix-bg-card rounded-xl p-4 animate-fade-in"
          >
            <div class="flex items-center gap-4">
              <!-- Game thumbnail -->
              <img 
                v-if="download.backgroundUrl"
                :src="download.backgroundUrl" 
                :alt="download.title"
                class="w-16 h-16 rounded-lg object-cover"
              />
              <div class="w-16 h-16 bg-remix-bg-hover rounded-lg flex items-center justify-center" v-else>
                <GamepadIcon class="w-8 h-8 text-remix-text-secondary" />
              </div>

              <!-- Download info -->
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold">{{ download.title }}</h3>
                  <span class="text-sm text-remix-text-secondary">
                    {{ download.progress }}%
                  </span>
                </div>

                <!-- Progress bar -->
                <div class="h-2 bg-remix-bg-hover rounded-full overflow-hidden mb-2">
                  <div 
                    class="h-full bg-gradient-to-r from-remix-accent to-remix-accent-hover transition-all duration-300"
                    :style="{ width: `${download.progress}%` }"
                  />
                </div>

                <!-- Stats -->
                <div class="flex items-center gap-4 text-sm text-remix-text-secondary">
                  <span>{{ formatSpeed(download.speed) }}</span>
                  <span>{{ formatSize(download.downloaded) }} / {{ formatSize(download.totalSize) }}</span>
                  <span>ETA: {{ formatEta(download.eta) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <button 
                  @click="pauseDownload(download.id)"
                  class="p-2 hover:bg-remix-bg-hover rounded-lg transition-colors"
                  title="Pause"
                >
                  <PauseIcon class="w-5 h-5" />
                </button>
                <button 
                  @click="cancelDownload(download.id)"
                  class="p-2 hover:bg-remix-error/20 text-remix-text-secondary hover:text-remix-error rounded-lg transition-colors"
                  title="Cancel"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Paused downloads -->
      <div v-if="pausedDownloads.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-remix-text-secondary mb-4">Paused</h2>
        <div class="space-y-3">
          <div 
            v-for="download in pausedDownloads" 
            :key="download.id"
            class="bg-remix-bg-card rounded-xl p-4 opacity-70"
          >
            <div class="flex items-center gap-4">
              <img 
                v-if="download.backgroundUrl"
                :src="download.backgroundUrl" 
                :alt="download.title"
                class="w-16 h-16 rounded-lg object-cover"
              />
              <div class="w-16 h-16 bg-remix-bg-hover rounded-lg flex items-center justify-center" v-else>
                <GamepadIcon class="w-8 h-8 text-remix-text-secondary" />
              </div>

              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold">{{ download.title }}</h3>
                  <span class="text-sm text-remix-warning">Paused - {{ download.progress }}%</span>
                </div>

                <div class="h-2 bg-remix-bg-hover rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-remix-warning/50"
                    :style="{ width: `${download.progress}%` }"
                  />
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button 
                  @click="resumeDownload(download.id)"
                  class="p-2 hover:bg-remix-accent/20 text-remix-text-secondary hover:text-remix-accent rounded-lg transition-colors"
                  title="Resume"
                >
                  <PlayIcon class="w-5 h-5" />
                </button>
                <button 
                  @click="cancelDownload(download.id)"
                  class="p-2 hover:bg-remix-error/20 text-remix-text-secondary hover:text-remix-error rounded-lg transition-colors"
                  title="Cancel"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Queued downloads -->
      <div v-if="queuedDownloads.length > 0">
        <h2 class="text-lg font-semibold text-remix-text-secondary mb-4">Queue</h2>
        <div class="space-y-3">
          <div 
            v-for="(download, index) in queuedDownloads" 
            :key="download.id"
            class="bg-remix-bg-card rounded-xl p-4 opacity-60"
          >
            <div class="flex items-center gap-4">
              <div class="w-8 text-center text-remix-text-secondary font-mono">
                {{ index + 1 }}
              </div>
              <img 
                v-if="download.backgroundUrl"
                :src="download.backgroundUrl" 
                :alt="download.title"
                class="w-12 h-12 rounded-lg object-cover"
              />
              <div class="w-12 h-12 bg-remix-bg-hover rounded-lg flex items-center justify-center" v-else>
                <GamepadIcon class="w-6 h-6 text-remix-text-secondary" />
              </div>

              <div class="flex-1">
                <h3 class="font-semibold">{{ download.title }}</h3>
                <span class="text-sm text-remix-text-secondary">{{ formatSize(download.totalSize) }}</span>
              </div>

              <div class="flex items-center gap-2">
                <button 
                  @click="moveUp(download.id)"
                  :disabled="index === 0"
                  class="p-2 hover:bg-remix-bg-hover rounded-lg transition-colors disabled:opacity-30"
                  title="Move Up"
                >
                  <ChevronUpIcon class="w-5 h-5" />
                </button>
                <button 
                  @click="moveDown(download.id)"
                  :disabled="index === queuedDownloads.length - 1"
                  class="p-2 hover:bg-remix-bg-hover rounded-lg transition-colors disabled:opacity-30"
                  title="Move Down"
                >
                  <ChevronDownIcon class="w-5 h-5" />
                </button>
                <button 
                  @click="cancelDownload(download.id)"
                  class="p-2 hover:bg-remix-error/20 text-remix-text-secondary hover:text-remix-error rounded-lg transition-colors"
                  title="Remove"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  DownloadCloudIcon, 
  GamepadIcon, 
  PauseIcon, 
  PlayIcon, 
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from 'lucide-vue-next'

interface Download {
  id: string
  title: string
  coverUrl?: string
  status: 'active' | 'paused' | 'queued'
  progress: number
  speed: number // bytes per second
  downloaded: number // bytes
  totalSize: number // bytes
  eta: number // seconds
}

const downloads = ref<Download[]>([])

const activeDownloads = computed(() => 
  downloads.value.filter(d => d.status === 'active')
)

const pausedDownloads = computed(() => 
  downloads.value.filter(d => d.status === 'paused')
)

const queuedDownloads = computed(() => 
  downloads.value.filter(d => d.status === 'queued')
)

const formatSpeed = (bytesPerSec: number) => {
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  }
  return `${bytesPerSec} B/s`
}

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} B`
}

const formatEta = (seconds: number) => {
  if (seconds <= 0) return '--'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

const pauseDownload = (id: string) => {
  const download = downloads.value.find(d => d.id === id)
  if (download) {
    download.status = 'paused'
  }
}

const resumeDownload = (id: string) => {
  const download = downloads.value.find(d => d.id === id)
  if (download) {
    download.status = 'active'
  }
}

const cancelDownload = (id: string) => {
  const index = downloads.value.findIndex(d => d.id === id)
  if (index !== -1) {
    downloads.value.splice(index, 1)
  }
}

const pauseAll = () => {
  downloads.value.forEach(d => {
    if (d.status === 'active') {
      d.status = 'paused'
    }
  })
}

const resumeAll = () => {
  downloads.value.forEach(d => {
    if (d.status === 'paused') {
      d.status = 'active'
    }
  })
}

const moveUp = (id: string) => {
  const queued = queuedDownloads.value
  const index = queued.findIndex(d => d.id === id)
  if (index > 0) {
    // Swap in main array
    const mainIndex = downloads.value.findIndex(d => d.id === id)
    const prevIndex = downloads.value.findIndex(d => d.id === queued[index - 1].id)
    ;[downloads.value[mainIndex], downloads.value[prevIndex]] = 
     [downloads.value[prevIndex], downloads.value[mainIndex]]
  }
}

const moveDown = (id: string) => {
  const queued = queuedDownloads.value
  const index = queued.findIndex(d => d.id === id)
  if (index < queued.length - 1) {
    const mainIndex = downloads.value.findIndex(d => d.id === id)
    const nextIndex = downloads.value.findIndex(d => d.id === queued[index + 1].id)
    ;[downloads.value[mainIndex], downloads.value[nextIndex]] = 
     [downloads.value[nextIndex], downloads.value[mainIndex]]
  }
}

// Polling for download updates (TODO: replace with WebSocket)
let pollInterval: number | null = null

onMounted(() => {
  // Start polling for download status
  // In production, this would fetch from the backend
  pollInterval = window.setInterval(() => {
    // Simulate progress for demo
    downloads.value.forEach(d => {
      if (d.status === 'active' && d.progress < 100) {
        d.progress = Math.min(100, d.progress + Math.random() * 2)
        d.downloaded = (d.progress / 100) * d.totalSize
        d.eta = Math.max(0, Math.floor((100 - d.progress) * 10))
      }
    })
  }, 1000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
