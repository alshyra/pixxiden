<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import SystemControls from './SystemControls.vue'
import GameCarousel from './GameCarousel.vue'

const gameStore = useGameStore()

// Props pour l'état du gamepad
defineProps<{
  gamepadConnected?: boolean
  gamepadName?: string
}>()
</script>

<template>
  <div class="w-full h-full bg-game-bg overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="px-8 py-4 border-b border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Game Launcher</h1>
          <div class="flex items-center gap-3 mt-1">
            <!-- Backend status -->
            <div 
              :class="[
                'w-2 h-2 rounded-full',
                gameStore.connected ? 'bg-green-500' : 'bg-red-500'
              ]"
            />
            <span class="text-gray-400 text-sm">
              {{ gameStore.connected ? 'Connecté' : 'Déconnecté' }}
            </span>
            
            <!-- Gamepad status -->
            <div 
              v-if="gamepadConnected"
              class="flex items-center gap-2 ml-3"
            >
              <svg 
                class="w-4 h-4 text-green-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z"
                />
              </svg>
              <span class="text-green-400 text-xs">Gamepad</span>
            </div>
            
            <!-- Game running indicator -->
            <div 
              v-if="gameStore.gameRunning"
              class="flex items-center gap-2 ml-4 px-3 py-1 bg-blue-600 rounded-full"
            >
              <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span class="text-white text-sm font-medium">
                🎮 {{ gameStore.currentGameTitle }}
              </span>
            </div>
          </div>
        </div>

        <!-- System Controls -->
        <SystemControls />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Loader pendant que le jeu tourne -->
      <div 
        v-if="gameStore.gameRunning && gameStore.overlayVisible"
        class="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-white text-2xl font-bold">{{ gameStore.currentGameTitle }}</p>
          <p class="text-gray-400 text-base">Jeu en cours...</p>
          <p class="text-gray-500 text-sm mt-4">Appuyez sur Home/PS pour {{ gameStore.overlayVisible ? 'retourner au jeu' : 'afficher le menu' }}</p>
          
          <!-- Boutons avec navigation gamepad -->
          <div class="flex gap-4 mt-8">
            <!-- Bouton Retour au jeu -->
            <button 
              @click="gameStore.hideOverlay()"
              :class="[
                'px-6 py-3 font-bold rounded-lg transition-all flex items-center gap-2',
                gameStore.overlaySelectedButton === 0 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-400 scale-110' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour au jeu
            </button>
            
            <!-- Bouton Force Kill -->
            <button 
              @click="gameStore.stopCurrentGame()"
              :class="[
                'px-6 py-3 font-bold rounded-lg transition-all flex items-center gap-2',
                gameStore.overlaySelectedButton === 1 
                  ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-400 scale-110' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Forcer l'arrêt du jeu
            </button>
          </div>
          
          <p class="text-gray-500 text-xs mt-4">Utilisez les flèches ← → ou le stick pour naviguer, A pour valider</p>
        </div>
      </div>

      <!-- Carrousel des jeux installés -->
      <div v-if="gameStore.installedGames.length > 0" class="flex-shrink-0">
        <GameCarousel 
          :games="gameStore.installedGames"
          :selected-index="gameStore.currentSection === 'carousel' ? gameStore.selectedIndex : -1"
          :is-active="gameStore.currentSection === 'carousel'"
        />
      </div>

      <!-- Grille des autres jeux (non installés) -->
      <div 
        v-if="gameStore.otherGames.length > 0"
        class="flex-1 overflow-y-auto px-8 pb-4"
        :class="{ 'opacity-60': gameStore.currentSection === 'carousel' }"
      >
        <h2 class="text-xl font-bold text-white mb-4 sticky top-0 bg-game-bg py-2 z-10">
          📚 Bibliothèque
          <span class="text-gray-400 text-base font-normal ml-2">({{ gameStore.otherGames.length }})</span>
        </h2>
        
        <div class="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <div
            v-for="(game, index) in gameStore.otherGames"
            :key="game.id"
            :class="[
              'relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200',
              'bg-game-card hover:bg-game-hover',
              gameStore.currentSection === 'grid' && gameStore.selectedIndex === index 
                ? 'ring-2 ring-blue-500 scale-105' 
                : ''
            ]"
            @click="gameStore.currentSection = 'grid'; gameStore.selectedIndex = index"
          >
            <!-- Cover image -->
            <div class="aspect-[3/4] bg-gray-800 flex items-center justify-center">
              <img 
                v-if="game.cover_url" 
                :src="game.cover_url" 
                :alt="game.title"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <svg 
                v-else
                class="w-12 h-12 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="1.5" 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="1.5" 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <!-- Game info -->
            <div class="p-3">
              <h3 class="text-white font-medium text-sm truncate">{{ game.title }}</h3>
              <p class="text-gray-500 text-xs mt-1">{{ game.platform?.toUpperCase() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Message si aucun jeu -->
      <div 
        v-if="gameStore.games.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-gray-500"
      >
        <svg 
          class="w-20 h-20 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p class="text-xl">Aucun jeu détecté</p>
        <p class="text-sm mt-2">
          {{ gameStore.connected ? 'Installez des jeux via Steam ou Heroic' : 'Vérifiez que le backend est lancé' }}
        </p>
      </div>
    </div>

    <!-- Footer avec instructions -->
    <div class="px-8 py-3 border-t border-gray-700 bg-gray-900/80 backdrop-blur flex-shrink-0">
      <div class="flex items-center justify-between text-sm text-gray-400">
        <div class="flex gap-6">
          <template v-if="gamepadConnected">
            <span>🎮 Navigation</span>
            <span>Ⓐ Lancer</span>
            <span>Ⓑ Retour</span>
            <span v-if="gameStore.gameRunning" class="text-blue-400">🏠 Home → Launcher</span>
          </template>
          <template v-else>
            <span>↑↓←→ Navigation</span>
            <span>Entrée Lancer</span>
          </template>
        </div>
        <div v-if="gameStore.selectedGame" class="flex items-center gap-2">
          <span class="text-gray-500">Sélection:</span>
          <span class="text-white font-medium">{{ gameStore.selectedGame.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ring-blue-500 {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}
</style>
