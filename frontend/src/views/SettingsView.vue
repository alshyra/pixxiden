<template>
  <div class="settings-view">
    <h1 class="text-3xl font-display font-bold mb-8">Settings</h1>

    <div class="grid grid-cols-4 gap-8">
      <!-- Sidebar navigation -->
      <nav class="col-span-1">
        <ul class="space-y-1">
          <li v-for="section in sections" :key="section.id">
            <button
              @click="activeSection = section.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
              :class="activeSection === section.id 
                ? 'bg-remix-accent/20 text-remix-accent' 
                : 'text-remix-text-secondary hover:bg-remix-bg-hover hover:text-remix-text-primary'"
            >
              <component :is="section.icon" class="w-5 h-5" />
              {{ section.label }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- Content area -->
      <div class="col-span-3">
        <!-- Stores Section -->
        <div v-if="activeSection === 'stores'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-6">Store Accounts</h2>
            
            <!-- Epic Games -->
            <div class="flex items-center justify-between py-4 border-b border-remix-border">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-[#313131] to-[#1a1a1a] rounded-lg flex items-center justify-center">
                  <span class="text-lg font-bold">E</span>
                </div>
                <div>
                  <h3 class="font-semibold">Epic Games Store</h3>
                  <p class="text-sm text-remix-text-secondary">
                    {{ stores.legendary.authenticated ? 'Connected' : 'Not connected' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="stores.legendary.authenticated"
                  @click="syncStore('legendary')"
                  :disabled="stores.legendary.syncing"
                  class="flex items-center gap-2 px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors"
                >
                  <RefreshCwIcon :class="['w-4 h-4', stores.legendary.syncing && 'animate-spin']" />
                  Sync
                </button>
                <button
                  @click="toggleStore('legendary')"
                  class="px-4 py-2 rounded-lg transition-colors"
                  :class="stores.legendary.authenticated 
                    ? 'bg-remix-error/20 text-remix-error hover:bg-remix-error/30' 
                    : 'bg-remix-accent hover:bg-remix-accent-hover text-white'"
                >
                  {{ stores.legendary.authenticated ? 'Disconnect' : 'Connect' }}
                </button>
              </div>
            </div>

            <!-- GOG -->
            <div class="flex items-center justify-between py-4 border-b border-remix-border">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-[#86328a] to-[#5c1d5f] rounded-lg flex items-center justify-center">
                  <span class="text-lg font-bold">G</span>
                </div>
                <div>
                  <h3 class="font-semibold">GOG.com</h3>
                  <p class="text-sm text-remix-text-secondary">
                    {{ stores.gogdl.authenticated ? 'Connected' : 'Not connected' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="stores.gogdl.authenticated"
                  @click="syncStore('gogdl')"
                  :disabled="stores.gogdl.syncing"
                  class="flex items-center gap-2 px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors"
                >
                  <RefreshCwIcon :class="['w-4 h-4', stores.gogdl.syncing && 'animate-spin']" />
                  Sync
                </button>
                <button
                  @click="toggleStore('gogdl')"
                  class="px-4 py-2 rounded-lg transition-colors"
                  :class="stores.gogdl.authenticated 
                    ? 'bg-remix-error/20 text-remix-error hover:bg-remix-error/30' 
                    : 'bg-remix-accent hover:bg-remix-accent-hover text-white'"
                >
                  {{ stores.gogdl.authenticated ? 'Disconnect' : 'Connect' }}
                </button>
              </div>
            </div>

            <!-- Amazon Games -->
            <div class="flex items-center justify-between py-4">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-[#ff9900] to-[#cc7a00] rounded-lg flex items-center justify-center">
                  <span class="text-lg font-bold text-black">A</span>
                </div>
                <div>
                  <h3 class="font-semibold">Amazon Games</h3>
                  <p class="text-sm text-remix-text-secondary">
                    {{ stores.nile.authenticated ? 'Connected' : 'Not connected' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="stores.nile.authenticated"
                  @click="syncStore('nile')"
                  :disabled="stores.nile.syncing"
                  class="flex items-center gap-2 px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors"
                >
                  <RefreshCwIcon :class="['w-4 h-4', stores.nile.syncing && 'animate-spin']" />
                  Sync
                </button>
                <button
                  @click="toggleStore('nile')"
                  class="px-4 py-2 rounded-lg transition-colors"
                  :class="stores.nile.authenticated 
                    ? 'bg-remix-error/20 text-remix-error hover:bg-remix-error/30' 
                    : 'bg-remix-accent hover:bg-remix-accent-hover text-white'"
                >
                  {{ stores.nile.authenticated ? 'Disconnect' : 'Connect' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Paths Section -->
        <div v-if="activeSection === 'paths'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-6">Paths & Storage</h2>
            
            <div class="space-y-6">
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">
                  Default Install Location
                </label>
                <div class="flex gap-3">
                  <input 
                    type="text"
                    v-model="paths.defaultInstall"
                    class="flex-1 bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                  />
                  <button class="px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors">
                    <FolderOpenIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">
                  Wine Prefixes Location
                </label>
                <div class="flex gap-3">
                  <input 
                    type="text"
                    v-model="paths.prefixes"
                    class="flex-1 bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                  />
                  <button class="px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors">
                    <FolderOpenIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">
                  Download Cache Location
                </label>
                <div class="flex gap-3">
                  <input 
                    type="text"
                    v-model="paths.downloadCache"
                    class="flex-1 bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                  />
                  <button class="px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors">
                    <FolderOpenIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Disk Usage -->
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-4">Disk Usage</h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-remix-text-secondary">Games</span>
                  <span>145.2 GB</span>
                </div>
                <div class="h-2 bg-remix-bg-hover rounded-full overflow-hidden">
                  <div class="h-full bg-remix-accent" style="width: 45%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-remix-text-secondary">Wine Prefixes</span>
                  <span>12.4 GB</span>
                </div>
                <div class="h-2 bg-remix-bg-hover rounded-full overflow-hidden">
                  <div class="h-full bg-remix-success" style="width: 15%"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-remix-text-secondary">Download Cache</span>
                  <span>3.1 GB</span>
                </div>
                <div class="h-2 bg-remix-bg-hover rounded-full overflow-hidden">
                  <div class="h-full bg-remix-warning" style="width: 5%"></div>
                </div>
              </div>
            </div>
            <button class="mt-4 text-sm text-remix-accent hover:text-remix-accent-hover transition-colors">
              Clear Download Cache
            </button>
          </div>
        </div>

        <!-- Runners Section -->
        <div v-if="activeSection === 'runners'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-6">Wine & Proton Runners</h2>
            
            <div class="space-y-4">
              <!-- Wine-GE -->
              <div class="flex items-center justify-between py-4 border-b border-remix-border">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-remix-bg-hover rounded-lg flex items-center justify-center">
                    <WineIcon class="w-5 h-5 text-remix-accent" />
                  </div>
                  <div>
                    <h3 class="font-semibold">Wine-GE</h3>
                    <p class="text-sm text-remix-text-secondary">
                      {{ runners.wineGE.version || 'Not installed' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span 
                    v-if="runners.wineGE.installed"
                    class="px-3 py-1 bg-remix-success/20 text-remix-success rounded-full text-sm"
                  >
                    Installed
                  </span>
                  <button
                    v-if="!runners.wineGE.installed"
                    class="px-4 py-2 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg transition-colors"
                  >
                    Install
                  </button>
                  <button class="px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors">
                    Configure
                  </button>
                </div>
              </div>

              <!-- Proton-GE -->
              <div class="flex items-center justify-between py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-remix-bg-hover rounded-lg flex items-center justify-center">
                    <CpuIcon class="w-5 h-5 text-remix-accent" />
                  </div>
                  <div>
                    <h3 class="font-semibold">Proton-GE</h3>
                    <p class="text-sm text-remix-text-secondary">
                      {{ runners.protonGE.version || 'Not installed' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span 
                    v-if="runners.protonGE.installed"
                    class="px-3 py-1 bg-remix-success/20 text-remix-success rounded-full text-sm"
                  >
                    Installed
                  </span>
                  <button
                    v-if="!runners.protonGE.installed"
                    class="px-4 py-2 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg transition-colors"
                  >
                    Install
                  </button>
                  <button class="px-4 py-2 bg-remix-bg-hover hover:bg-remix-border rounded-lg transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            </div>

            <button class="mt-6 flex items-center gap-2 text-remix-accent hover:text-remix-accent-hover transition-colors">
              <PlusIcon class="w-4 h-4" />
              Add Custom Runner
            </button>
          </div>

          <!-- Default Runner -->
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-4">Default Runner</h3>
            <select 
              v-model="defaultRunner"
              class="w-full bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
            >
              <option value="auto">Auto-detect</option>
              <option value="wine-ge">Wine-GE</option>
              <option value="proton-ge">Proton-GE</option>
              <option value="native">Native Linux</option>
            </select>
            <p class="mt-2 text-sm text-remix-text-secondary">
              Used when no specific runner is configured for a game.
            </p>
          </div>
        </div>

        <!-- Interface Section -->
        <div v-if="activeSection === 'interface'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-6">Interface</h2>
            
            <div class="space-y-6">
              <!-- Theme -->
              <div>
                <label class="block text-sm text-remix-text-secondary mb-3">Theme</label>
                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="theme in themes"
                    :key="theme.id"
                    @click="selectedTheme = theme.id"
                    class="p-4 rounded-lg border-2 transition-all"
                    :class="selectedTheme === theme.id 
                      ? 'border-remix-accent bg-remix-accent/10' 
                      : 'border-remix-border hover:border-remix-text-secondary'"
                  >
                    <div class="w-full h-12 rounded mb-2" :style="{ background: theme.preview }"></div>
                    <span class="text-sm">{{ theme.name }}</span>
                  </button>
                </div>
              </div>

              <!-- Grid Size -->
              <div>
                <label class="block text-sm text-remix-text-secondary mb-3">
                  Grid Size: {{ gridSize }}
                </label>
                <input 
                  type="range" 
                  min="3" 
                  max="8" 
                  v-model="gridSize"
                  class="w-full accent-remix-accent"
                />
              </div>

              <!-- Language -->
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">Language</label>
                <select 
                  v-model="language"
                  class="w-full bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <!-- Fullscreen toggle -->
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium">Start in Fullscreen</h3>
                  <p class="text-sm text-remix-text-secondary">Launch app in fullscreen mode (Big Picture)</p>
                </div>
                <button 
                  @click="startFullscreen = !startFullscreen"
                  class="w-12 h-6 rounded-full transition-colors"
                  :class="startFullscreen ? 'bg-remix-accent' : 'bg-remix-bg-hover'"
                >
                  <div 
                    class="w-5 h-5 bg-white rounded-full transition-transform"
                    :class="startFullscreen ? 'translate-x-6' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Network Section -->
        <div v-if="activeSection === 'network'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-6">Network</h2>
            
            <div class="space-y-6">
              <!-- Bandwidth Limit -->
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">
                  Download Speed Limit
                </label>
                <div class="flex items-center gap-3">
                  <input 
                    type="number"
                    v-model="bandwidthLimit"
                    :disabled="!limitBandwidth"
                    class="w-32 bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent disabled:opacity-50"
                  />
                  <span class="text-remix-text-secondary">MB/s</span>
                  <label class="flex items-center gap-2 ml-4">
                    <input type="checkbox" v-model="limitBandwidth" class="accent-remix-accent" />
                    <span class="text-sm">Enable limit</span>
                  </label>
                </div>
              </div>

              <!-- Concurrent Downloads -->
              <div>
                <label class="block text-sm text-remix-text-secondary mb-2">
                  Concurrent Downloads
                </label>
                <select 
                  v-model="concurrentDownloads"
                  class="w-32 bg-remix-bg-hover border border-remix-border rounded-lg px-4 py-2 text-remix-text-primary focus:outline-none focus:ring-2 focus:ring-remix-accent"
                >
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                  <option :value="3">3</option>
                  <option :value="4">4</option>
                </select>
              </div>

              <!-- Offline Mode -->
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium">Offline Mode</h3>
                  <p class="text-sm text-remix-text-secondary">Use cached data only, no network requests</p>
                </div>
                <button 
                  @click="offlineMode = !offlineMode"
                  class="w-12 h-6 rounded-full transition-colors"
                  :class="offlineMode ? 'bg-remix-accent' : 'bg-remix-bg-hover'"
                >
                  <div 
                    class="w-5 h-5 bg-white rounded-full transition-transform"
                    :class="offlineMode ? 'translate-x-6' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div v-if="activeSection === 'about'" class="space-y-6 animate-fade-in">
          <div class="bg-remix-bg-card rounded-xl p-6 text-center">
            <div class="w-20 h-20 bg-gradient-to-br from-remix-accent to-remix-accent-hover rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GamepadIcon class="w-10 h-10 text-white" />
            </div>
            <h2 class="text-2xl font-display font-bold mb-2">PixiDen</h2>
            <p class="text-remix-text-secondary mb-4">Version 0.1.0</p>
            <p class="text-sm text-remix-text-secondary max-w-md mx-auto">
              A cozy game library launcher for Linux with multi-store support and session mode capabilities.
            </p>
            <div class="flex justify-center gap-4 mt-6">
              <a href="#" class="text-remix-accent hover:text-remix-accent-hover transition-colors">
                GitHub
              </a>
              <a href="#" class="text-remix-accent hover:text-remix-accent-hover transition-colors">
                Documentation
              </a>
              <a href="#" class="text-remix-accent hover:text-remix-accent-hover transition-colors">
                Report Bug
              </a>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="mt-8 flex justify-end">
          <button 
            @click="saveSettings"
            class="flex items-center gap-2 px-6 py-3 bg-remix-accent hover:bg-remix-accent-hover text-white rounded-lg font-semibold transition-colors"
          >
            <SaveIcon class="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, markRaw } from 'vue'
import { 
  StoreIcon, 
  FolderOpenIcon, 
  WineIcon, 
  PaletteIcon, 
  WifiIcon, 
  InfoIcon,
  RefreshCwIcon,
  SaveIcon,
  CpuIcon,
  PlusIcon,
  GamepadIcon
} from 'lucide-vue-next'

const sections = [
  { id: 'stores', label: 'Store Accounts', icon: markRaw(StoreIcon) },
  { id: 'paths', label: 'Paths & Storage', icon: markRaw(FolderOpenIcon) },
  { id: 'runners', label: 'Runners', icon: markRaw(WineIcon) },
  { id: 'interface', label: 'Interface', icon: markRaw(PaletteIcon) },
  { id: 'network', label: 'Network', icon: markRaw(WifiIcon) },
  { id: 'about', label: 'About', icon: markRaw(InfoIcon) },
]

const activeSection = ref('stores')

// Store accounts state
const stores = reactive({
  legendary: { authenticated: false, syncing: false },
  gogdl: { authenticated: false, syncing: false },
  nile: { authenticated: false, syncing: false },
})

// Paths state
const paths = reactive({
  defaultInstall: '~/Games',
  prefixes: '~/.local/share/pixiden/prefixes',
  downloadCache: '~/.cache/pixiden/downloads',
})

// Runners state
const runners = reactive({
  wineGE: { installed: true, version: 'GE-Proton8-26' },
  protonGE: { installed: false, version: '' },
})
const defaultRunner = ref('auto')

// Interface state
const themes = [
  { id: 'remix-dark', name: 'ReMiX Dark', preview: 'linear-gradient(135deg, #0A0A0B, #1A1A1D)' },
  { id: 'remix-darker', name: 'ReMiX Darker', preview: 'linear-gradient(135deg, #050506, #0A0A0B)' },
  { id: 'remix-purple', name: 'ReMiX Purple', preview: 'linear-gradient(135deg, #1a0a1e, #2d1035)' },
]
const selectedTheme = ref('remix-dark')
const gridSize = ref(5)
const language = ref('en')
const startFullscreen = ref(false)

// Network state
const bandwidthLimit = ref(0)
const limitBandwidth = ref(false)
const concurrentDownloads = ref(2)
const offlineMode = ref(false)

const toggleStore = async (store: 'legendary' | 'gogdl' | 'nile') => {
  if (stores[store].authenticated) {
    // Logout
    stores[store].authenticated = false
  } else {
    // TODO: Call backend to initiate OAuth
    // For now, simulate login
    stores[store].authenticated = true
  }
}

const syncStore = async (store: 'legendary' | 'gogdl' | 'nile') => {
  stores[store].syncing = true
  // TODO: Call backend to sync
  await new Promise(resolve => setTimeout(resolve, 2000))
  stores[store].syncing = false
}

const saveSettings = () => {
  // TODO: Save settings to backend/config file
  console.log('Saving settings...', {
    paths,
    defaultRunner: defaultRunner.value,
    selectedTheme: selectedTheme.value,
    gridSize: gridSize.value,
    language: language.value,
    startFullscreen: startFullscreen.value,
    bandwidthLimit: bandwidthLimit.value,
    limitBandwidth: limitBandwidth.value,
    concurrentDownloads: concurrentDownloads.value,
    offlineMode: offlineMode.value,
  })
}

onMounted(async () => {
  // TODO: Load settings from backend
  // TODO: Check store authentication status
})
</script>
