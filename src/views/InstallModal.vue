<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        @click.self="close"
      >
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 max-w-3xl w-full mx-4 border border-remix-accent/30 shadow-glow-strong">
          <!-- Header -->
          <div class="mb-6">
            <div class="text-xs text-remix-accent uppercase font-bold mb-2 tracking-widest">
              Configuration Système
            </div>
            <h2 class="text-4xl font-black italic tracking-tight">
              INSTALLER {{ (game?.title || '').toUpperCase() }}
            </h2>
          </div>
          
          <!-- Game Info Header (like design ref) -->
          <div class="flex items-center gap-4 pb-6 mb-6 border-b border-white/10">
            <div 
              class="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
              :style="{ backgroundImage: `url(${mockAssets.gridUrl})` }"
            ></div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-white">{{ game?.title || 'Hollow Knight' }}</h3>
              <div class="flex items-center gap-2 mt-1">
                <Badge :variant="game?.store || 'gog'" :label="(game?.store || 'GOG').toUpperCase()" />
              </div>
            </div>
          </div>
          
          <!-- Install Path -->
          <div class="mb-6">
            <label class="block text-xs text-white/60 uppercase font-bold mb-2 tracking-wider">
              📁 Chemin d'installation
            </label>
            <div class="flex gap-2">
              <input 
                v-model="installPath"
                type="text"
                class="flex-1 px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all"
                placeholder="~/Games/Pixxiden"
              />
              <button 
                @click="browseFolder"
                class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white hover:bg-white/10 hover:border-remix-accent/50 transition-all"
              >
                📂 Parcourir
              </button>
            </div>
            <p class="text-xs text-white/40 mt-2">
              Le jeu sera installé dans ce dossier
            </p>
          </div>
          
          <!-- Disk Space Info -->
          <div class="mb-6 p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm text-white/70">Taille du jeu</span>
              <span class="text-sm font-bold text-white">{{ formatSize(gameSize) }}</span>
            </div>
            
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm text-white/70">Espace disponible</span>
              <span 
                class="text-sm font-bold"
                :class="hasEnoughSpace ? 'text-remix-success' : 'text-remix-error'"
              >
                {{ formatSize(availableSpace) }}
              </span>
            </div>
            
            <!-- Progress Bar -->
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all"
                :class="diskUsagePercent > 90 ? 'bg-remix-error' : 'bg-remix-accent'"
                :style="{ width: `${Math.min(diskUsagePercent, 100)}%` }"
              ></div>
            </div>
            
            <!-- Warning if not enough space -->
            <div 
              v-if="!hasEnoughSpace" 
              class="flex items-center gap-2 mt-3 text-xs text-remix-error"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Espace disque insuffisant pour installer ce jeu</span>
            </div>
          </div>
          
          <!-- Proton/Wine Version (for Windows games) -->
          <div v-if="needsWine" class="mb-6">
            <label class="block text-xs text-white/60 uppercase font-bold mb-2 tracking-wider">
              🍷 Couche de compatibilité
            </label>
            <Select 
              v-model="selectedRunner"
              :options="runnerOptions"
            />
            <p class="text-xs text-white/40 mt-2">
              {{ runnerDescription }}
            </p>
          </div>
          
          <!-- Additional Options -->
          <div class="mb-6 space-y-3">
            <Toggle 
              v-model="createDesktopShortcut"
              label="Créer un raccourci bureau"
              description="Ajouter une icône sur le bureau"
            />
            
            <Toggle 
              v-model="addToSteam"
              label="Ajouter à Steam (raccourci non-Steam)"
              description="Le jeu apparaîtra dans votre bibliothèque Steam"
            />
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-4">
            <button 
              @click="close"
              class="flex-1 px-6 py-4 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-white transition-all"
            >
              Annuler
            </button>
            <button 
              @click="confirmInstall"
              :disabled="!hasEnoughSpace || installing"
              class="flex-1 px-6 py-4 bg-remix-accent hover:bg-remix-accent-hover rounded-xl font-bold text-white transition-all shadow-glow hover:shadow-glow-strong disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-glow flex items-center justify-center gap-2"
            >
              <svg v-if="!installing" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ installing ? 'Installation...' : 'Démarrer l\'installation' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Select, Toggle, Badge } from '@/components/ui'
import * as api from '@/services/api'
import type { Game } from '@/types'

interface Props {
  modelValue: boolean
  game: Game | null | undefined
}

interface InstallConfig {
  gameId: string
  installPath: string
  runner: string
  createShortcut: boolean
  addToSteam: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'install-started': [config: InstallConfig]
}>()

// Two-way binding
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Mock SteamGridDB assets for visual
const mockAssets = {
  gridUrl: 'https://cdn2.steamgriddb.com/grid/0db0138edfb3e20181de2c91ab4c5168.png',
}

// State (mock data for design validation)
const installPath = ref('~/Games/GOG/Hollow Knight')
const gameSize = ref(9200000000) // 9.2 GB in bytes
const availableSpace = ref(50000000000) // 50 GB available
const selectedRunner = ref('ge-proton-8-32')
const createDesktopShortcut = ref(true)
const addToSteam = ref(false)
const installing = ref(false)
const gameVersion = ref('1.0.0')

// Runner options
const runnerOptions = [
  { value: 'ge-proton-8-32', label: 'GE-Proton 8-32 (Recommandé)' },
  { value: 'ge-proton-8-31', label: 'GE-Proton 8-31' },
  { value: 'proton-experimental', label: 'Proton Experimental' },
  { value: 'wine-ge-8-26', label: 'Wine-GE 8-26' },
]

// Computed
const needsWine = computed(() => {
  return props.game?.runner !== 'native'
})

const runnerDescription = computed(() => {
  const descriptions: Record<string, string> = {
    'ge-proton-8-32': 'Version stable avec les derniers correctifs communautaires',
    'proton-experimental': 'Version expérimentale avec support des derniers jeux',
    'wine-ge-8-26': 'Wine avec patches de compatibilité',
  }
  return descriptions[selectedRunner.value] || 'Couche de compatibilité Windows'
})

const diskUsagePercent = computed(() => {
  if (availableSpace.value === 0) return 0
  return ((availableSpace.value - gameSize.value) / availableSpace.value) * 100
})

const hasEnoughSpace = computed(() => {
  return availableSpace.value > gameSize.value * 1.1 // 10% margin
})

// Methods
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function close() {
  show.value = false
}

async function browseFolder() {
  // TODO: Tauri file picker
  console.log('TODO: Open file picker')
}

async function loadGameInfo() {
  if (!props.game) return
  
  try {
    const config = await api.getGameConfig(props.game.id)
    gameSize.value = config.downloadSize || 9200000000
    gameVersion.value = config.version || '1.0.0'
    
    const diskInfo = await api.getDiskInfo()
    const targetDisk = diskInfo.find(d => installPath.value.startsWith(d.mountPoint))
    availableSpace.value = targetDisk?.availableSpace || 50000000000
  } catch (error) {
    console.error('Failed to load game info:', error)
  }
}

async function confirmInstall() {
  if (!hasEnoughSpace.value || installing.value || !props.game) return
  
  installing.value = true
  
  try {
    const installConfig: InstallConfig = {
      gameId: props.game.id,
      installPath: installPath.value,
      runner: needsWine.value ? selectedRunner.value : 'native',
      createShortcut: createDesktopShortcut.value,
      addToSteam: addToSteam.value,
    }
    
    emit('install-started', installConfig)
    close()
  } catch (error) {
    console.error('Failed to start installation:', error)
  } finally {
    installing.value = false
  }
}

// Watch for modal open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadGameInfo()
  }
})
</script>