<template>
  <div class="settings-overlay">
    <!-- Sidebar -->
    <aside class="settings-sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="28" height="28" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#5e5ce6" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            <path 
              d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
              fill="none" 
              stroke="url(#logo-grad)" 
              stroke-width="4"
            />
            <text x="50" y="62" text-anchor="middle" font-size="28" font-weight="900" fill="white">
              PX
            </text>
          </svg>
        </div>
        <span class="logo-text">Pixxiden</span>
      </div>
      
      <!-- Navigation -->
      <nav class="settings-nav">
        <div class="nav-label">CONFIGURATION</div>
        
        <button 
          v-for="section in sections" 
          :key="section.id"
          @click="activeSection = section.id"
          class="nav-item"
          :class="{ 'active': activeSection === section.id }"
        >
          <span class="nav-indicator"></span>
          <span class="nav-icon">{{ section.icon }}</span>
          <span class="nav-text">{{ section.label }}</span>
        </button>
      </nav>
      
      <!-- Version Badge -->
      <div class="version-badge">
        <div class="version-label">VERSION</div>
        <div class="version-number">v0.1.0-alpha</div>
      </div>
      
      <!-- Close Button -->
      <button @click="closeSettings" class="close-button">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Fermer</span>
      </button>
    </aside>
    
    <!-- Main Content -->
    <main class="settings-content">
      <!-- Système Section -->
      <div v-if="activeSection === 'systeme'" class="section-panel">
        <header class="section-header">
          <h1 class="glow-title">Système</h1>
          <p class="section-subtitle">Informations machine et gestion des mises à jour.</p>
        </header>
        
        <div v-if="loadingSystem" class="loading-card">
          <div class="loader-small"></div>
          <span>Chargement des informations système...</span>
        </div>
        
        <div v-else class="section-content">
          <!-- System Info Card -->
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Système d'exploitation</span>
              <span class="info-value">{{ systemInfo?.osName || 'Inconnu' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Kernel</span>
              <span class="info-value accent">{{ systemInfo?.kernelVersion || 'Inconnu' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Processeur</span>
              <span class="info-value">{{ systemInfo?.cpuBrand || 'Inconnu' }}</span>
            </div>
            <div class="info-row no-border">
              <span class="info-label">Mémoire</span>
              <span class="info-value">{{ formatMemory(systemInfo?.totalMemory || 0) }}</span>
            </div>
          </div>
          
          <!-- Disk Info Card -->
          <div v-if="diskInfo.length > 0" class="info-card">
            <h3 class="card-title">Stockage</h3>
            <div v-for="(disk, index) in diskInfo" :key="index" class="disk-item">
              <div class="disk-header">
                <span class="disk-path">{{ disk.mountPoint }}</span>
                <span class="disk-space">
                  {{ formatBytes(disk.usedSpace) }} / {{ formatBytes(disk.totalSpace) }}
                </span>
              </div>
              <div class="disk-bar">
                <div 
                  class="disk-progress"
                  :class="{ 'danger': disk.usedSpace / disk.totalSpace > 0.9 }"
                  :style="{ width: `${(disk.usedSpace / disk.totalSpace) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="action-buttons">
            <button 
              @click="checkUpdates"
              :disabled="checkingUpdates"
              class="action-btn primary"
            >
              <svg v-if="!checkingUpdates" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div v-else class="loader-tiny"></div>
              {{ checkingUpdates ? 'VÉRIFICATION...' : 'VÉRIFIER LES MISES À JOUR' }}
            </button>
            <button @click="shutdown" class="action-btn danger">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              ÉTEINDRE LA MACHINE
            </button>
          </div>
        </div>
      </div>
      
      <!-- Comptes Section -->
      <div v-if="activeSection === 'comptes'" class="section-panel">
        <header class="section-header">
          <h1 class="glow-title">Comptes</h1>
          <p class="section-subtitle">Connectez vos stores pour synchroniser votre bibliothèque.</p>
        </header>
        
        <div class="section-content">
          <div 
            v-for="store in stores" 
            :key="store.id"
            class="store-card"
          >
            <div class="store-info">
              <div class="store-icon" :class="`store-${store.id}`">
                {{ store.name.substring(0, 2).toUpperCase() }}
              </div>
              <div class="store-details">
                <h3 class="store-name">{{ store.name }}</h3>
                <p class="store-status" :class="{ 'connected': store.authenticated }">
                  {{ store.authenticated ? `CONNECTÉ — ${store.username}` : 'DÉCONNECTÉ' }}
                </p>
              </div>
            </div>
            <button 
              class="store-btn"
              :class="{ 'connected': store.authenticated }"
              @click="toggleStoreConnection(store)"
            >
              {{ store.authenticated ? 'DÉCONNEXION' : 'CONNEXION' }}
            </button>
          </div>
          
          <!-- Info message -->
          <div class="info-message">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>La connexion aux stores utilise les outils Legendary, GOGdl et Nile.</span>
          </div>
        </div>
      </div>
      
      <!-- Avancé Section -->
      <div v-if="activeSection === 'avance'" class="section-panel">
        <header class="section-header">
          <h1 class="glow-title">Avancé</h1>
          <p class="section-subtitle">Configuration experte de la couche de compatibilité.</p>
        </header>
        
        <div class="section-content">
          <div class="info-card">
            <!-- Proton Version -->
            <div class="setting-row">
              <div class="setting-info">
                <h3 class="setting-title">Version Proton Global</h3>
                <p class="setting-description">Compatibilité par défaut pour les titres Windows.</p>
              </div>
              <div class="setting-control">
                <select v-model="protonVersion" class="custom-select">
                  <option value="ge-proton-8-32">GE-Proton 8-32</option>
                  <option value="ge-proton-8-31">GE-Proton 8-31</option>
                  <option value="ge-proton-8-30">GE-Proton 8-30</option>
                  <option value="proton-experimental">Proton Experimental</option>
                </select>
              </div>
            </div>
            
            <!-- MangoHud Overlay -->
            <div class="setting-row no-border">
              <div class="setting-info">
                <h3 class="setting-title">Overlay MangoHud</h3>
                <p class="setting-description">Monitorage des FPS et ressources système.</p>
              </div>
              <div class="setting-control">
                <button 
                  @click="mangoHudEnabled = !mangoHudEnabled"
                  class="toggle-switch"
                  :class="{ 'active': mangoHudEnabled }"
                  role="switch"
                  :aria-checked="mangoHudEnabled"
                >
                  <span class="toggle-thumb"></span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Save Button -->
          <button @click="saveSettings" class="save-button">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            SAUVEGARDER LES PARAMÈTRES
          </button>
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

// Close settings (go back to library)
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

// Toggle store connection (placeholder)
function toggleStoreConnection(store: typeof stores.value[0]) {
  // TODO: Implement store authentication
  console.log('Toggle connection for:', store.name)
}

// Check for updates
async function checkUpdates() {
  checkingUpdates.value = true
  try {
    hasUpdates.value = await api.checkForUpdates()
    if (!hasUpdates.value) {
      // Could show a toast notification here
      console.log('No updates available')
    }
  } catch (error) {
    console.error('Failed to check updates:', error)
  } finally {
    checkingUpdates.value = false
  }
}

// Shutdown system
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
    // Could show a success toast here
    console.log('Settings saved')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Format memory
function formatMemory(bytes: number): string {
  return formatBytes(bytes)
}

// Handle keyboard
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
.settings-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  padding-bottom: 80px; /* Space for footer */
  z-index: 50;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
}

/* Sidebar */
.settings-sidebar {
  width: 280px;
  background: rgba(15, 15, 18, 0.98);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  font-style: italic;
  color: white;
}

/* Navigation */
.settings-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.15em;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: white;
  background: rgba(255, 255, 255, 0.08);
}

.nav-indicator {
  position: absolute;
  left: 0;
  width: 4px;
  height: 0;
  background: #5e5ce6;
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 15px #5e5ce6;
  transition: height 0.2s ease;
}

.nav-item.active .nav-indicator {
  height: 20px;
}

.nav-icon {
  font-size: 1rem;
}

.nav-text {
  flex: 1;
}

/* Version Badge */
.version-badge {
  margin-top: auto;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-align: center;
  margin-bottom: 1rem;
}

.version-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.15em;
  margin-bottom: 0.25rem;
}

.version-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: #5e5ce6;
}

/* Close Button */
.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-button:hover {
  color: white;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

/* Main Content */
.settings-content {
  flex: 1;
  background: rgba(20, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
  overflow-y: auto;
}

.section-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section Header */
.section-header {
  margin-bottom: 2rem;
}

.glow-title {
  font-size: 3.5rem;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.03em;
  color: white;
  position: relative;
  display: inline-block;
}

.glow-title::before {
  content: '';
  position: absolute;
  top: 60%;
  left: 50%;
  width: 140%;
  height: 80%;
  background: #5e5ce6;
  filter: blur(50px);
  opacity: 0.3;
  z-index: -1;
  transform: translate(-50%, -50%);
}

.section-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Info Card */
.info-card {
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.info-row.no-border {
  border-bottom: none;
}

.info-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
}

.info-value.accent {
  color: #5e5ce6;
}

/* Disk progress */
.disk-item {
  margin-bottom: 1rem;
}

.disk-item:last-child {
  margin-bottom: 0;
}

.disk-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.disk-path {
  color: rgba(255, 255, 255, 0.6);
}

.disk-space {
  color: white;
  font-weight: 500;
}

.disk-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.disk-progress {
  height: 100%;
  background: #5e5ce6;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.disk-progress.danger {
  background: #ef4444;
}

/* Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 14px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid;
}

.action-btn.primary {
  background: rgba(10, 10, 10, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  border-color: rgba(94, 92, 230, 0.5);
  box-shadow: 0 0 20px rgba(94, 92, 230, 0.3);
}

.action-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.danger {
  background: rgba(10, 10, 10, 0.8);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.action-btn.danger:hover {
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

/* Store Cards */
.store-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.25rem;
}

.store-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.store-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: #5e5ce6;
  color: white;
  box-shadow: 0 0 15px rgba(94, 92, 230, 0.4);
}

.store-icon.store-steam {
  background: #1b2838;
}

.store-icon.store-epic {
  background: #2a2a2a;
}

.store-icon.store-gog {
  background: #722ed1;
}

.store-icon.store-amazon {
  background: #ff9900;
  color: #000;
}

.store-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.store-name {
  font-size: 1rem;
  font-weight: 700;
  color: white;
}

.store-status {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.store-status.connected {
  color: #10b981;
}

.store-btn {
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #5e5ce6;
  border: none;
  color: white;
  box-shadow: 0 0 15px rgba(94, 92, 230, 0.4);
}

.store-btn:hover {
  background: #7c7ae8;
}

.store-btn.connected {
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.store-btn.connected:hover {
  border-color: rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

/* Info Message */
.info-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(94, 92, 230, 0.1);
  border: 1px solid rgba(94, 92, 230, 0.2);
  border-radius: 12px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Settings rows */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.setting-row.no-border {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Custom Select */
.custom-select {
  appearance: none;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.custom-select:focus {
  outline: none;
  border-color: rgba(94, 92, 230, 0.5);
  box-shadow: 0 0 15px rgba(94, 92, 230, 0.2);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
}

.toggle-switch.active {
  background: #5e5ce6;
  box-shadow: 0 0 20px rgba(94, 92, 230, 0.5);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(24px);
}

/* Save Button */
.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1.25rem;
  background: #5e5ce6;
  border: none;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(94, 92, 230, 0.4);
}

.save-button:hover {
  background: #7c7ae8;
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.5);
}

/* Loading states */
.loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.loader-small {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #5e5ce6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loader-tiny {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .settings-overlay {
    flex-direction: column;
    padding: 1rem;
  }
  
  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }
  
  .sidebar-logo {
    margin-bottom: 0;
  }
  
  .settings-nav {
    flex-direction: row;
    flex: unset;
    gap: 0.5rem;
  }
  
  .nav-label {
    display: none;
  }
  
  .nav-item {
    padding: 0.75rem 1rem;
  }
  
  .nav-indicator {
    display: none;
  }
  
  .version-badge {
    display: none;
  }
  
  .close-button {
    margin-left: auto;
  }
  
  .glow-title {
    font-size: 2.5rem;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
