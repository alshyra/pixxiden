<template>
  <div class="game-detail">
    <!-- Back button -->
    <button 
      @click="$router.back()" 
      class="flex items-center gap-2 text-remix-text-secondary hover:text-remix-text-primary mb-6 transition-colors"
    >
      <ArrowLeftIcon class="w-5 h-5" />
      <span>Back to Library</span>
    </button>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center h-96">
      <Loader2Icon class="w-10 h-10 text-remix-accent animate-spin" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-16">
      <AlertCircleIcon class="w-16 h-16 text-remix-error mx-auto mb-4" />
      <h2 class="text-xl font-semibold mb-2">Game not found</h2>
      <p class="text-remix-text-secondary">{{ error }}</p>
    </div>

    <!-- Game content -->
    <div v-else-if="game" class="animate-fade-in">
      <!-- Hero section with cover -->
      <div class="relative rounded-2xl overflow-hidden mb-8 h-80 bg-remix-bg-card">
        <img 
          v-if="game.backgroundUrl" 
          :src="game.backgroundUrl" 
          :alt="game.title"
          class="w-full h-full object-cover opacity-40"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-remix-bg-dark via-remix-bg-dark/50 to-transparent" />
        
        <!-- Game info overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-8">
          <div class="flex items-end gap-6">
            <!-- Cover thumbnail -->
            <img 
              v-if="game.backgroundUrl"
              :src="game.backgroundUrl" 
              :alt="game.title"
              class="w-32 h-44 rounded-lg shadow-lg object-cover"
            />
            <div class="w-32 h-44 bg-remix-bg-hover rounded-lg flex items-center justify-center" v-else>
              <GamepadIcon class="w-12 h-12 text-remix-text-secondary" />
            </div>

            <div class="flex-1">
              <h1 class="text-4xl font-display font-bold mb-2">{{ game.title }}</h1>
              <p class="text-remix-text-secondary text-lg">
                {{ game.developer || 'Unknown Developer' }}
              </p>
              <div class="flex items-center gap-4 mt-3">
                <span 
                  class="px-3 py-1 rounded-full text-sm font-medium"
                  :class="game.installed ? 'bg-remix-success/20 text-remix-success' : 'bg-remix-bg-hover text-remix-text-secondary'"
                >
                  {{ game.installed ? 'Installed' : 'Not Installed' }}
                </span>
                <span class="text-remix-text-secondary text-sm">
                  {{ getStoreLabel(game.storeId) }}
                </span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-4">
              <button
                v-if="game.installed"
                @click="launchGame"
                :disabled="launching"
                class="flex items-center gap-2 px-8 py-3 bg-remix-success hover:bg-remix-success/80 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-glow disabled:opacity-50"
              >
                <PlayIcon v-if="!launching" class="w-5 h-5" />
                <Loader2Icon v-else class="w-5 h-5 animate-spin" />
                {{ launching ? 'Launching...' : 'Play' }}
              </button>
              <button
                v-else
                @click="installGame"
                :disabled="installing"
                class="flex items-center gap-2 px-8 py-3 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-glow disabled:opacity-50"
              >
                <DownloadIcon v-if="!installing" class="w-5 h-5" />
                <Loader2Icon v-else class="w-5 h-5 animate-spin" />
                {{ installing ? 'Installing...' : 'Install' }}
              </button>
              <button
                v-if="game.installed"
                @click="showUninstallConfirm = true"
                class="flex items-center gap-2 px-4 py-3 bg-remix-bg-hover hover:bg-remix-error/20 text-remix-text-secondary hover:text-remix-error rounded-lg transition-all"
              >
                <TrashIcon class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats & Info Grid -->
      <div class="grid grid-cols-4 gap-6 mb-8">
        <div class="bg-remix-bg-card rounded-xl p-6">
          <p class="text-remix-text-secondary text-sm mb-1">Play Time</p>
          <p class="text-2xl font-semibold">{{ formatPlayTime(game.playTime) }}</p>
        </div>
        <div class="bg-remix-bg-card rounded-xl p-6">
          <p class="text-remix-text-secondary text-sm mb-1">Last Played</p>
          <p class="text-2xl font-semibold">{{ formatLastPlayed(game.lastPlayed) }}</p>
        </div>
        <div class="bg-remix-bg-card rounded-xl p-6">
          <p class="text-remix-text-secondary text-sm mb-1">Store</p>
          <p class="text-2xl font-semibold">{{ getStoreLabel(game.storeId) }}</p>
        </div>
        <div class="bg-remix-bg-card rounded-xl p-6">
          <p class="text-remix-text-secondary text-sm mb-1">Runner</p>
          <p class="text-2xl font-semibold">{{ game.runner || 'Auto' }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-remix-border mb-6">
        <nav class="flex gap-8">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            class="pb-4 text-sm font-medium transition-colors relative"
            :class="activeTab === tab.id ? 'text-remix-accent' : 'text-remix-text-secondary hover:text-remix-text-primary'"
          >
            {{ tab.label }}
            <span 
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-remix-accent rounded-full"
            />
          </button>
        </nav>
      </div>

      <!-- Tab content -->
      <div class="animate-fade-in">
        <!-- Overview tab -->
        <div v-if="activeTab === 'overview'">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-4">About</h3>
            <p class="text-remix-text-secondary leading-relaxed">
              {{ metadata?.description || 'No description available for this game.' }}
            </p>
          </div>
        </div>

        <!-- Settings tab -->
        <div v-if="activeTab === 'settings'" class="space-y-6">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-4">Launch Options</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">Runner</label>
                <select 
                  v-model="selectedRunner"
                  class="w-full bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                >
                  <option value="">Auto (detect)</option>
                  <option value="wine-ge">Wine-GE</option>
                  <option value="proton-ge">Proton-GE</option>
                  <option value="native">Native Linux</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">Launch Arguments</label>
                <input 
                  type="text"
                  v-model="launchArgs"
                  placeholder="Additional launch arguments..."
                  class="w-full bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary placeholder-remix-text-secondary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Uninstall confirmation modal -->
    <div 
      v-if="showUninstallConfirm" 
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      @click.self="showUninstallConfirm = false"
    >
      <div class="bg-remix-bg-card rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        <h3 class="text-xl font-semibold mb-4">Uninstall Game</h3>
        <p class="text-remix-text-secondary mb-6">
          Are you sure you want to uninstall <strong>{{ game?.title }}</strong>? This will remove the game files from your system.
        </p>
        <div class="flex gap-4 justify-end">
          <button 
            @click="showUninstallConfirm = false"
            class="px-6 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="uninstallGame"
            class="px-6 py-2 bg-remix-error hover:bg-remix-error/80 text-white rounded-lg transition-colors"
          >
            Uninstall
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeftIcon, 
  PlayIcon, 
  DownloadIcon, 
  TrashIcon, 
  Loader2Icon,
  AlertCircleIcon,
  GamepadIcon
} from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import type { Game, Metadata } from '@/types'

const route = useRoute()
const router = useRouter()
const libraryStore = useLibraryStore()

const loading = ref(true)
const error = ref<string | null>(null)
const game = ref<Game | null>(null)
const metadata = ref<Metadata | null>(null)
const launching = ref(false)
const installing = ref(false)
const showUninstallConfirm = ref(false)
const activeTab = ref('overview')
const selectedRunner = ref('')
const launchArgs = ref('')

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
]

const getStoreLabel = (storeId: string) => {
  const stores: Record<string, string> = {
    'legendary': 'Epic Games',
    'gogdl': 'GOG',
    'nile': 'Amazon Games',
  }
  return stores[storeId] || storeId
}

const formatPlayTime = (minutes?: number) => {
  if (!minutes || minutes === 0) return 'Never'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

const formatLastPlayed = (date?: string) => {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return d.toLocaleDateString()
}

const launchGame = async () => {
  if (!game.value) return
  launching.value = true
  try {
    await libraryStore.launchGame(game.value.appId)
  } catch (e) {
    console.error('Failed to launch game:', e)
  } finally {
    launching.value = false
  }
}

const installGame = async () => {
  if (!game.value) return
  installing.value = true
  try {
    await libraryStore.installGame(game.value.appId)
  } catch (e) {
    console.error('Failed to install game:', e)
  } finally {
    installing.value = false
  }
}

const uninstallGame = async () => {
  if (!game.value) return
  showUninstallConfirm.value = false
  try {
    await libraryStore.uninstallGame(game.value.appId)
    router.push('/')
  } catch (e) {
    console.error('Failed to uninstall game:', e)
  }
}

onMounted(async () => {
  const gameId = route.params.id as string
  loading.value = true
  
  try {
    // Fetch game from store or API
    await libraryStore.fetchGames()
    game.value = libraryStore.games.find(g => g.id === gameId || g.appId === gameId) || null
    
    if (!game.value) {
      error.value = 'Game not found in your library'
    }
  } catch (e) {
    error.value = 'Failed to load game details'
  } finally {
    loading.value = false
  }
})
</script>
