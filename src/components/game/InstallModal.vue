<template>
  <Modal 
    v-model="showInstallModal" 
    title="Installer le jeu"
    size="lg"
  >
    <!-- Game Info Header -->
    <div class="flex items-center gap-4 pb-6 border-b border-white/10">
      <div 
        class="w-20 h-20 rounded-xl bg-cover bg-center"
        :style="{ backgroundImage: `url(${game.backgroundUrl || '/placeholder.png'})` }"
      ></div>
      <div class="flex-1">
        <h3 class="text-xl font-bold text-white">{{ game.title }}</h3>
        <div class="flex items-center gap-2 mt-1">
          <Badge :variant="game.store" :label="game.store.toUpperCase()" />
          <span class="text-sm text-white/50">Version {{ gameVersion }}</span>
        </div>
      </div>
    </div>
    
    <!-- Installation Path -->
    <div class="mt-6">
      <label class="block text-sm font-semibold text-white mb-2">
        📁 Dossier d'installation
      </label>
      <div class="flex gap-2">
        <input 
          v-model="installPath"
          type="text"
          class="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all"
          placeholder="~/Games/Epic/Cyberpunk 2077"
        />
        <Button 
          variant="outline"
          @click="browseInstallPath"
        >
          📂 Parcourir
        </Button>
      </div>
      <p class="text-xs text-white/40 mt-2">
        Le jeu sera installé dans ce dossier
      </p>
    </div>
    
    <!-- Disk Space Info -->
    <div class="mt-6 p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl">
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
      
      <p 
        v-if="!hasEnoughSpace" 
        class="flex items-center gap-2 mt-3 text-xs text-remix-error"
      >
        <AlertTriangle class="w-4 h-4" />
        Espace disque insuffisant pour installer ce jeu
      </p>
    </div>
    
    <!-- Wine/Proton Options (Windows games only) -->
    <div v-if="needsWine" class="mt-6">
      <label class="block text-sm font-semibold text-white mb-2">
        🍷 Couche de compatibilité
      </label>
      <Select 
        v-model="selectedRunner"
        :options="runnerOptions"
        placeholder="Sélectionner Proton/Wine"
      />
      <p class="text-xs text-white/40 mt-2">
        {{ selectedRunnerDescription }}
      </p>
    </div>
    
    <!-- Additional Options -->
    <div class="mt-6 space-y-3">
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
    
    <!-- Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between gap-4 w-full">
        <!-- Cancel -->
        <Button 
          variant="ghost" 
          @click="showInstallModal = false"
          class="flex-1"
        >
          Annuler
        </Button>
        
        <!-- Install -->
        <Button 
          variant="primary" 
          @click="confirmInstall"
          :disabled="!hasEnoughSpace || installing"
          :loading="installing"
          class="flex-1"
        >
          <template #icon v-if="!installing">
            <Download class="w-5 h-5" />
          </template>
          {{ installing ? 'Installation...' : 'Installer' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, Select, Toggle, Button, Badge } from '@/components/ui'
import { Download, AlertTriangle } from 'lucide-vue-next'
import * as api from '@/services/api'
import type { Game } from '@/types'

export interface InstallConfig {
  gameId: string
  installPath: string
  runner: string
  createShortcut: boolean
  addToSteam: boolean
}

interface Props {
  game: Game
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'install-started': [config: InstallConfig]
}>()

// Two-way binding for modal visibility
const showInstallModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Installation config
const installPath = ref(`~/Games/${props.game.store}/${props.game.title}`)
const gameSize = ref(0) // Bytes
const availableSpace = ref(0) // Bytes
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
  // Check if game needs Wine/Proton (Windows game on Linux)
  return props.game.runner !== 'native'
})

const selectedRunnerDescription = computed(() => {
  const descriptions: Record<string, string> = {
    'ge-proton-8-32': 'Version stable avec les derniers correctifs communautaires',
    'proton-experimental': 'Version expérimentale avec support des derniers jeux',
  }
  return descriptions[selectedRunner.value] || 'Couche de compatibilité Windows'
})

const diskUsagePercent = computed(() => {
  if (availableSpace.value === 0) return 0
  const usedSpace = availableSpace.value - gameSize.value
  return (usedSpace / availableSpace.value) * 100
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

async function browseInstallPath() {
  // TODO: Open native file picker via Tauri
  // const selected = await open({
  //   directory: true,
  //   defaultPath: installPath.value
  // })
  // if (selected) installPath.value = selected
  
  console.log('TODO: Open file picker')
}

async function loadGameInfo() {
  try {
    // Get game size from store API
    const config = await api.getGameConfig(props.game.id)
    gameSize.value = config.downloadSize || 0
    gameVersion.value = config.version || '1.0.0'
    
    // Get available disk space for install path
    const diskInfo = await api.getDiskInfo()
    const targetDisk = diskInfo.find(d => installPath.value.startsWith(d.mountPoint))
    availableSpace.value = targetDisk?.availableSpace || 0
  } catch (error) {
    console.error('Failed to load game info:', error)
  }
}

async function confirmInstall() {
  if (!hasEnoughSpace.value || installing.value) return
  
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
    
    // Start installation
    await api.installGame(props.game.id, installPath.value)
    
    // Close modal
    showInstallModal.value = false
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
