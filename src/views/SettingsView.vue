<template>
  <div class="flex h-screen bg-black text-white font-sans">
    <!-- Sidebar -->
    <aside class="w-72 border-r border-remix-border p-10 flex flex-col">
      <!-- Logo -->
      <div class="flex items-center gap-3 mb-16 px-2">
        <div class="w-7 h-7 rounded-lg bg-remix-accent shadow-[0_0_20px_rgba(94,92,230,0.5)]"></div>
        <span class="text-xl font-bold italic">Pixxiden</span>
      </div>
      
      <!-- Navigation -->
      <nav class="space-y-8 flex-1" role="tablist" aria-label="Configuration sections">
        <div class="text-xs font-bold text-remix-text-secondary tracking-wider mb-4 px-2">CONFIGURATION</div>
        <button
          v-for="section in sections"
          :key="section.id"
          @click="activeSection = section.id"
          role="tab"
          :aria-selected="activeSection === section.id"
          :aria-controls="`panel-${section.id}`"
          class="remix-nav-item block text-sm font-bold text-left w-full px-2"
          :class="activeSection === section.id ? 'active' : 'text-gray-400'"
        >
          {{ section.label }}
        </button>
      </nav>

      <!-- Version Badge -->
      <div class="mt-auto px-2 py-4 border border-remix-border rounded-lg text-center">
        <div class="text-xs font-bold text-remix-text-secondary mb-1">VERSION</div>
        <div class="text-sm font-bold text-remix-accent">v0.1.0-alpha</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-24 bg-gradient-to-b from-remix-accent/5 to-transparent overflow-y-auto">
      <!-- Système Section -->
      <div v-if="activeSection === 'systeme'" id="panel-systeme" role="tabpanel" aria-labelledby="tab-systeme" class="animate-fade-in">
        <h1 class="text-5xl font-extrabold italic tracking-tighter mb-4">Système</h1>
        <p class="text-remix-text-secondary mb-8">Informations machine et gestion des mises à jour.</p>
        
        <div class="bg-remix-bg-card border border-remix-border rounded-[14px] p-8 mb-6">
          <!-- OS -->
          <div class="flex items-center justify-between py-4 border-b border-remix-border">
            <span class="text-remix-text-secondary">OS</span>
            <span class="font-semibold">PixxOS (Arch)</span>
          </div>

          <!-- Kernel -->
          <div class="flex items-center justify-between py-4 border-b border-remix-border">
            <span class="text-remix-text-secondary">Kernel</span>
            <span class="font-semibold text-remix-accent">6.7.2-zen1-1-zen</span>
          </div>

          <!-- Hardware -->
          <div class="flex items-center justify-between py-4">
            <span class="text-remix-text-secondary">Hardware</span>
            <span class="font-semibold">AMD Custom APU (Aerith)</span>
          </div>
        </div>

        <!-- Update Button -->
        <button class="w-full bg-remix-bg-card border border-remix-border rounded-[14px] py-6 font-bold text-sm tracking-widest hover:border-remix-accent hover:shadow-[0_0_20px_rgba(94,92,230,0.3)] transition-all">
          VÉRIFIER LES MISES À JOUR
        </button>
      </div>

      <!-- Comptes Section -->
      <div v-if="activeSection === 'comptes'" id="panel-comptes" role="tabpanel" aria-labelledby="tab-comptes" class="animate-fade-in">
        <h1 class="text-5xl font-extrabold italic tracking-tighter mb-4">Comptes</h1>
        <p class="text-remix-text-secondary mb-8">Connectez vos stores pour synchroniser votre bibliothèque.</p>
        
        <div class="space-y-4">
          <!-- Epic Games -->
          <div class="bg-remix-bg-card border border-remix-border rounded-[14px] p-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-remix-accent rounded-lg flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(94,92,230,0.4)]">
                Ep
              </div>
              <div>
                <h3 class="font-bold">Epic Games</h3>
                <p class="text-sm text-remix-success font-semibold">CONNECTÉ — PIXX_DEV</p>
              </div>
            </div>
            <button class="px-6 py-2 bg-remix-bg-card border border-remix-border rounded-lg font-bold text-sm hover:border-remix-accent transition-colors">
              DÉCONNEXION
            </button>
          </div>

          <!-- GOG -->
          <div class="bg-remix-bg-card border border-remix-border rounded-[14px] p-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-remix-accent rounded-lg flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(94,92,230,0.4)]">
                GO
              </div>
              <div>
                <h3 class="font-bold">GOG (GoodOldGames)</h3>
                <p class="text-sm text-remix-text-secondary font-semibold">DÉCONNECTÉ</p>
              </div>
            </div>
            <button class="px-6 py-2 bg-remix-accent rounded-lg font-bold text-sm hover:bg-remix-accent-hover shadow-[0_0_15px_rgba(94,92,230,0.4)] transition-all">
              CONNEXION
            </button>
          </div>

          <!-- Amazon Games -->
          <div class="bg-remix-bg-card border border-remix-border rounded-[14px] p-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-remix-accent rounded-lg flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(94,92,230,0.4)]">
                Am
              </div>
              <div>
                <h3 class="font-bold">Amazon Games</h3>
                <p class="text-sm text-remix-success font-semibold">CONNECTÉ — PRIME_PRIME</p>
              </div>
            </div>
            <button class="px-6 py-2 bg-remix-bg-card border border-remix-border rounded-lg font-bold text-sm hover:border-remix-accent transition-colors">
              DÉCONNEXION
            </button>
          </div>
        </div>
      </div>

      <!-- Avancé Section -->
      <div v-if="activeSection === 'avance'" id="panel-avance" role="tabpanel" aria-labelledby="tab-avance" class="animate-fade-in">
        <h1 class="text-5xl font-extrabold italic tracking-tighter mb-4">Avancé</h1>
        <p class="text-remix-text-secondary mb-8">Configuration experte de la couche de compatibilité.</p>
        
        <div class="bg-remix-bg-card border border-remix-border rounded-[14px] p-8 space-y-6">
          <!-- Proton Version -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold mb-1">Version Proton Global</h3>
              <p class="text-sm text-remix-text-secondary">Compatibilité par défaut pour les titres Windows.</p>
            </div>
            <div class="relative">
              <select 
                v-model="protonVersion"
                aria-label="Select Proton version"
                class="appearance-none bg-[#000000] border border-remix-border rounded-lg px-6 py-3 pr-12 font-semibold text-sm focus:outline-none focus:border-remix-accent focus:shadow-[0_0_15px_rgba(94,92,230,0.3)] transition-all cursor-pointer"
              >
                <option value="ge-proton-8-32">GE-Proton 8-32</option>
                <option value="ge-proton-8-31">GE-Proton 8-31</option>
                <option value="ge-proton-8-30">GE-Proton 8-30</option>
                <option value="proton-experimental">Proton Experimental</option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-4 h-4 text-remix-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- MangoHud Overlay -->
          <div class="flex items-center justify-between pt-6 border-t border-remix-border">
            <div>
              <h3 class="font-bold mb-1">Overlay MangoHud</h3>
              <p class="text-sm text-remix-text-secondary">Monitorage des FPS et ressources système.</p>
            </div>
            <button 
              @click="mangoHudEnabled = !mangoHudEnabled"
              role="switch"
              :aria-checked="mangoHudEnabled"
              aria-label="Toggle MangoHud overlay"
              class="remix-switch relative w-14 h-7 rounded-full transition-all duration-300"
              :class="mangoHudEnabled ? 'bg-remix-accent shadow-[0_0_20px_rgba(94,92,230,0.6)]' : 'bg-remix-border'"
            >
              <div 
                class="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300"
                :class="mangoHudEnabled ? 'translate-x-7' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { id: 'systeme', label: 'Système' },
  { id: 'comptes', label: 'Comptes' },
  { id: 'avance', label: 'Avancé' },
]

const activeSection = ref('systeme')
const protonVersion = ref('ge-proton-8-32')
const mangoHudEnabled = ref(false)
</script>

<style scoped>
.remix-nav-item {
  position: relative;
  transition: all 0.3s ease;
}

.remix-nav-item::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #5e5ce6;
  box-shadow: 0 0 12px #5e5ce6;
  transition: width 0.3s ease;
}

.remix-nav-item.active::after {
  width: 100%;
}

.remix-nav-item.active {
  text-shadow: 0 0 12px rgba(94, 92, 230, 0.6);
  color: white;
}

.remix-nav-item:hover:not(.active) {
  color: rgba(255, 255, 255, 0.8);
}

/* Switch glow effect */
.remix-switch {
  box-shadow: 0 0 0 rgba(94, 92, 230, 0);
}

.remix-switch:hover {
  transform: scale(1.05);
}
</style>
