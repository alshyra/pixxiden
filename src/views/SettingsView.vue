<template>
  <div class="fixed inset-0 flex gap-6 p-6 pb-20 z-50 bg-black/85 backdrop-blur-lg">
    <!-- Sidebar -->
    <aside class="w-[280px] flex-shrink-0 bg-[#0f0f12]/98 backdrop-blur-[40px] border border-white/10 rounded-[20px] p-6 flex flex-col">
      <!-- Logo -->
      <div class="flex items-center gap-3 mb-8 px-2">
        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <PixxidenLogo :size="40" :glow="true" />
        </div>
        <span class="text-xl font-bold italic text-white">Pixxiden</span>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 flex flex-col gap-2">
        <div class="text-[0.7rem] font-bold text-white/40 tracking-[0.15em] mb-3 px-2">
          CONFIGURATION
        </div>
        
        <button 
          v-for="section in sections" 
          :key="section.id"
          @click="activeSection = section.id"
          class="group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all"
          :class="[
            activeSection === section.id 
              ? 'text-white bg-white/8' 
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          ]"
        >
          <!-- Indicator -->
          <span 
            class="absolute left-0 rounded-r transition-all"
            :class="[
              activeSection === section.id 
                ? 'w-1 h-5 bg-[#5e5ce6] shadow-[0_0_15px_#5e5ce6]' 
                : 'w-0 h-0'
            ]"
          ></span>
          
          <span class="text-base">{{ section.icon }}</span>
          <span>{{ section.label }}</span>
        </button>
      </nav>
      
      <!-- Version Badge -->
      <div class="p-4 border border-white/10 rounded-xl text-center mb-4">
        <div class="text-[0.65rem] font-bold text-white/40 tracking-[0.15em] mb-1">
          VERSION
        </div>
        <div class="text-sm font-bold text-[#5e5ce6]">
          v0.1.0-alpha
        </div>
      </div>
      
      <!-- Close Button -->
      <button 
        @click="closeSettings" 
        class="flex items-center justify-center gap-2 px-3.5 py-3.5 rounded-xl text-sm font-semibold text-white/60 bg-white/5 border border-white/10 hover:text-white hover:bg-red-500/15 hover:border-red-500/30 transition-all"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Fermer</span>
      </button>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 bg-[#141419]/95 border border-white/10 rounded-[20px] p-8 overflow-y-auto">
      <!-- Système Section -->
      <div v-if="activeSection === 'systeme'" class="animate-fade-in">
        <header class="mb-8">
          <div class="relative inline-block">
            <h1 class="relative z-10 text-[3.5rem] font-black italic tracking-tight text-white">
              Système
            </h1>
            <div class="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[80%] bg-[#5e5ce6] blur-[50px] opacity-30 -z-10"></div>
          </div>
          <p class="text-white/50 mt-2">Informations machine et gestion des mises à jour.</p>
        </header>
        
        <div v-if="loadingSystem" class="flex items-center justify-center gap-4 p-12 bg-[#0a0a0a]/80 border border-white/8 rounded-2xl">
          <div class="w-6 h-6 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin"></div>
          <span class="text-white/50">Chargement des informations système...</span>
        </div>
        
        <div v-else class="flex flex-col gap-6">
          <!-- System Info Card -->
          <div class="bg-[#0a0a0a]/80 border border-white/8 rounded-2xl p-6">
            <div class="flex justify-between items-center py-4 border-b border-white/8">
              <span class="text-sm text-white/50">Système d'exploitation</span>
              <span class="text-sm font-semibold text-white">{{ systemInfo?.osName || 'Inconnu' }}</span>
            </div>
            <div class="flex justify-between items-center py-4 border-b border-white/8">
              <span class="text-sm text-white/50">Kernel</span>
              <span class="text-sm font-semibold text-[#5e5ce6]">{{ systemInfo?.kernelVersion || 'Inconnu' }}</span>
            </div>
            <div class="flex justify-between items-center py-4 border-b border-white/8">
              <span class="text-sm text-white/50">Processeur</span>
              <span class="text-sm font-semibold text-white">{{ systemInfo?.cpuBrand || 'Inconnu' }}</span>
            </div>
            <div class="flex justify-between items-center py-4">
              <span class="text-sm text-white/50">Mémoire</span>
              <span class="text-sm font-semibold text-white">{{ formatMemory(systemInfo?.totalMemory || 0) }}</span>
            </div>
          </div>
          
          <!-- Disk Info Card -->
          <div v-if="diskInfo.length > 0" class="bg-[#0a0a0a]/80 border border-white/8 rounded-2xl p-6">
            <h3 class="text-base font-bold text-white mb-4">Stockage</h3>
            <div v-for="(disk, index) in diskInfo" :key="index" class="mb-4 last:mb-0">
              <div class="flex justify-between text-[0.85rem] mb-2">
                <span class="text-white/60">{{ disk.mountPoint }}</span>
                <span class="text-white font-medium">
                  {{ formatBytes(disk.usedSpace) }} / {{ formatBytes(disk.totalSpace) }}
                </span>
              </div>
              <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="disk.usedSpace / disk.totalSpace > 0.9 ? 'bg-red-500' : 'bg-[#5e5ce6]'"
                  :style="{ width: `${(disk.usedSpace / disk.totalSpace) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-4">
            <button 
              @click="checkUpdates"
              :disabled="checkingUpdates"
              class="flex items-center justify-center gap-3 px-5 py-5 bg-[#0a0a0a]/80 border border-white/10 rounded-[14px] text-[0.8rem] font-bold tracking-wide text-white hover:border-[#5e5ce6]/50 hover:shadow-[0_0_20px_rgba(94,92,230,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg v-if="!checkingUpdates" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div v-else class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              {{ checkingUpdates ? 'VÉRIFICATION...' : 'VÉRIFIER LES MISES À JOUR' }}
            </button>
            
            <button 
              @click="shutdown" 
              class="flex items-center justify-center gap-3 px-5 py-5 bg-[#0a0a0a]/80 border border-red-500/30 rounded-[14px] text-[0.8rem] font-bold tracking-wide text-red-500 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              ÉTEINDRE LA MACHINE
            </button>
          </div>
        </div>
      </div>
      
      <!-- Comptes Section -->
      <div v-if="activeSection === 'comptes'" class="animate-fade-in">
        <header class="mb-8">
          <div class="relative inline-block">
            <h1 class="relative z-10 text-[3.5rem] font-black italic tracking-tight text-white">
              Comptes
            </h1>
            <div class="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[80%] bg-[#5e5ce6] blur-[50px] opacity-30 -z-10"></div>
          </div>
          <p class="text-white/50 mt-2">Connectez vos stores pour synchroniser votre bibliothèque.</p>
        </header>
        
        <div class="flex flex-col gap-6">
          <!-- Store Cards -->
          <div 
            v-for="store in stores" 
            :key="store.id"
            class="flex items-center justify-between bg-[#0a0a0a]/80 border border-white/8 rounded-[14px] p-5"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(94,92,230,0.4)]"
                :class="{
                  'bg-[#1b2838]': store.id === 'steam',
                  'bg-[#2a2a2a]': store.id === 'epic',
                  'bg-[#722ed1]': store.id === 'gog',
                  'bg-[#ff9900] text-black': store.id === 'amazon',
                  'bg-[#5e5ce6] text-white': !['steam', 'epic', 'gog', 'amazon'].includes(store.id)
                }"
              >
                {{ store.name.substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-base font-bold text-white">{{ store.name }}</h3>
                <p 
                  class="text-xs font-semibold mt-0.5"
                  :class="store.authenticated ? 'text-green-500' : 'text-white/40'"
                >
                  {{ store.authenticated ? `CONNECTÉ — ${store.username}` : 'DÉCONNECTÉ' }}
                </p>
              </div>
            </div>
            <button 
              @click="toggleStoreConnection(store)"
              class="px-5 py-2.5 rounded-[10px] text-xs font-bold transition-all"
              :class="store.authenticated 
                ? 'bg-[#0a0a0a]/80 border border-white/10 text-white hover:border-red-500/50 hover:text-red-500' 
                : 'bg-[#5e5ce6] text-white shadow-[0_0_15px_rgba(94,92,230,0.4)] hover:bg-[#7c7ae8] border-0'"
            >
              {{ store.authenticated ? 'DÉCONNEXION' : 'CONNEXION' }}
            </button>
          </div>
          
          <!-- Info message -->
          <div class="flex items-center gap-3 p-4 bg-[#5e5ce6]/10 border border-[#5e5ce6]/20 rounded-xl text-[0.85rem] text-white/70">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>La connexion aux stores utilise les outils Legendary, GOGdl et Nile.</span>
          </div>
        </div>
      </div>
      
      <!-- Avancé Section -->
      <div v-if="activeSection === 'avance'" class="animate-fade-in">
        <header class="mb-8">
          <div class="relative inline-block">
            <h1 class="relative z-10 text-[3.5rem] font-black italic tracking-tight text-white">
              Avancé
            </h1>
            <div class="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[80%] bg-[#5e5ce6] blur-[50px] opacity-30 -z-10"></div>
          </div>
          <p class="text-white/50 mt-2">Configuration experte de la couche de compatibilité.</p>
        </header>
        
        <div class="flex flex-col gap-6">
          <!-- Settings Card -->
          <div class="bg-[#0a0a0a]/80 border border-white/8 rounded-2xl p-6">
            <!-- Proton Version -->
            <div class="flex items-center justify-between py-5 border-b border-white/8">
              <div class="flex-1">
                <h3 class="text-[0.95rem] font-bold text-white mb-1">
                  Version Proton Global
                </h3>
                <p class="text-[0.8rem] text-white/50">
                  Compatibilité par défaut pour les titres Windows.
                </p>
              </div>
              <Select 
                v-model="protonVersion" 
                :options="protonVersions"
                placeholder="Sélectionner une version"
              />
            </div>
            
            <!-- MangoHud Overlay -->
            <div class="flex items-center justify-between py-5">
              <div class="flex-1">
                <h3 class="text-[0.95rem] font-bold text-white mb-1">
                  Overlay MangoHud
                </h3>
                <p class="text-[0.8rem] text-white/50">
                  Monitorage des FPS et ressources système.
                </p>
              </div>
              <Toggle 
                v-model="mangoHudEnabled"
                label="Overlay MangoHud"
              />
            </div>
          </div>
          
          <!-- Save Button -->
          <Button 
            variant="primary"
            size="lg"
            class="w-full"
            @click="saveSettings"
          >
            <template #icon>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </template>
            SAUVEGARDER LES PARAMÈTRES
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as api from '@/services/api'
import type { SystemInfo, DiskInfo } from '@/services/api'
import { PixxidenLogo, Select, Toggle, Button, type SelectOption } from '@/components/ui'

const router = useRouter()

const sections = [
  { id: 'systeme', label: 'Système', icon: '⚙️' },
  { id: 'comptes', label: 'Comptes', icon: '👤' },
  { id: 'avance', label: 'Avancé', icon: '🔧' },
]

const activeSection = ref('systeme')

// System state
const systemInfo = ref<SystemInfo | null>(null)
const diskInfo = ref<DiskInfo[]>([])
const loadingSystem = ref(false)
const checkingUpdates = ref(false)
const hasUpdates = ref(false)

// Store state
const stores = ref([
  { id: 'epic', name: 'Epic Games', available: false, authenticated: false, username: '' },
  { id: 'gog', name: 'GOG Galaxy', available: false, authenticated: false, username: '' },
  { id: 'amazon', name: 'Amazon Games', available: false, authenticated: false, username: '' },
  { id: 'steam', name: 'Steam', available: false, authenticated: false, username: '' },
])

// Settings state
const protonVersion = ref('ge-proton-8-32')
const mangoHudEnabled = ref(false)

// Proton versions options
const protonVersions: SelectOption[] = [
  { value: 'ge-proton-8-32', label: 'GE-Proton 8-32' },
  { value: 'ge-proton-8-31', label: 'GE-Proton 8-31' },
  { value: 'ge-proton-8-30', label: 'GE-Proton 8-30' },
  { value: 'proton-experimental', label: 'Proton Experimental' },
]

// Close settings
function closeSettings() {
  router.push('/')
}

// Load system info
async function loadSystemInfo() {
  loadingSystem.value = true
  try {
    systemInfo.value = await api.getSystemInfo()
    diskInfo.value = await api.getDiskInfo()
  } catch (error) {
    console.error('Failed to load system info:', error)
  } finally {
    loadingSystem.value = false
  }
}

// Load store status
async function loadStoreStatus() {
  try {
    const storeStatuses = await api.getStoreStatus()
    storeStatuses.forEach(status => {
      const store = stores.value.find(s => s.id === status.name)
      if (store) {
        store.available = status.available
        store.authenticated = status.authenticated
      }
    })
  } catch (error) {
    console.error('Failed to load store status:', error)
  }
}

// Load settings
async function loadSettings() {
  try {
    const settings = await api.getSettings()
    protonVersion.value = settings.protonVersion
    mangoHudEnabled.value = settings.mangoHudEnabled
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

// Toggle store connection
function toggleStoreConnection(store: typeof stores.value[0]) {
  console.log('Toggle connection for:', store.name)
}

// Check for updates
async function checkUpdates() {
  checkingUpdates.value = true
  try {
    hasUpdates.value = await api.checkForUpdates()
    if (!hasUpdates.value) {
      console.log('No updates available')
    }
  } catch (error) {
    console.error('Failed to check updates:', error)
  } finally {
    checkingUpdates.value = false
  }
}

// Shutdown
async function shutdown() {
  if (confirm('Êtes-vous sûr de vouloir éteindre la machine ?')) {
    try {
      await api.shutdownSystem()
    } catch (error) {
      console.error('Failed to shutdown:', error)
    }
  }
}

// Save settings
async function saveSettings() {
  try {
    await api.saveSettings({
      protonVersion: protonVersion.value,
      mangoHudEnabled: mangoHudEnabled.value,
      defaultInstallPath: '~/Games',
      winePrefixPath: '~/.local/share/pixxiden/prefixes',
    })
    console.log('Settings saved')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

// Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatMemory(bytes: number): string {
  return formatBytes(bytes)
}

// Keyboard handler
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
    e.preventDefault()
    closeSettings()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  
  await Promise.all([
    loadSystemInfo(),
    loadStoreStatus(),
    loadSettings(),
  ])
})
</script>

<style scoped>
/* Animation fade-in */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease;
}

/* Custom scrollbar */
main::-webkit-scrollbar {
  width: 6px;
}

main::-webkit-scrollbar-track {
  background: transparent;
}

main::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

main::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive */
@media (max-width: 1024px) {
  .fixed {
    flex-direction: column;
    padding: 1rem;
  }
  
  aside {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }
  
  nav {
    flex-direction: row;
    flex: unset;
    gap: 0.5rem;
  }
  
  .text-\[0\.7rem\] {
    display: none;
  }
  
  .version-badge {
    display: none;
  }
  
  .close-button {
    margin-left: auto;
  }
  
  .text-\[3\.5rem\] {
    font-size: 2.5rem;
  }
  
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>