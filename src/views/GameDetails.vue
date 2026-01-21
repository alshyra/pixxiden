<template>
  <div class="game-details min-h-screen bg-black text-white">
    <!-- Background -->
    <div class="absolute inset-0 overflow-hidden">
      <img 
        v-if="game?.backgroundUrl || game?.coverUrl"
        :src="game?.backgroundUrl || game?.coverUrl"
        class="w-full h-full object-cover opacity-50 blur-sm scale-110"
      />
      <div class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
    </div>
    
    <!-- Content -->
    <div class="relative z-10 min-h-screen flex">
      <!-- Left Panel: Game Info -->
      <div class="flex-1 p-12 flex flex-col justify-center max-w-3xl">
        <!-- Back Button -->
        <button 
          class="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          @click="$router.back()"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
          </svg>
          Back
        </button>
        
        <!-- Title -->
        <h1 class="text-5xl font-bold mb-4">{{ game?.title }}</h1>
        
        <!-- Meta -->
        <div class="flex items-center gap-3 mb-6 text-sm">
          <Badge variant="outline">PC (Windows)</Badge>
          <Badge v-if="metadata?.releaseDate" variant="outline">
            {{ new Date(metadata.releaseDate).getFullYear() }}
          </Badge>
          <Badge v-if="metacriticScore" variant="success">{{ metacriticScore }}</Badge>
        </div>
        
        <!-- Stats -->
        <div class="space-y-3 mb-8">
          <div class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Time Played</span>
            <span class="text-white/80">{{ formattedPlayTime }}</span>
          </div>
          <div v-if="game?.lastPlayed" class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Last Played</span>
            <span class="text-white/80">{{ formattedLastPlayed }}</span>
          </div>
          <div v-if="achievements" class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Achievements</span>
            <span class="text-white/80">{{ achievements }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-green-400 font-medium">Completion Status</span>
            <span class="text-white/80">{{ completionStatus }}</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-4 mb-8">
          <Button 
            v-if="game?.installed"
            variant="success" 
            size="lg"
            @click="playGame"
          >
            <template #icon>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
            </template>
            {{ isPlaying ? 'Running' : 'Play' }}
          </Button>
          
          <Button 
            v-else
            variant="primary" 
            size="lg"
            :disabled="installing"
            @click="installGame"
          >
            <template #icon>
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </template>
            Install
          </Button>
          
          <Button variant="secondary" @click="showSettings = true">
            •••
          </Button>
          
          <Button v-if="isPlaying" variant="ghost" @click="returnToGame">
            Return to Game
          </Button>
          
          <Button v-if="isPlaying" variant="ghost" @click="exitGame">
            Exit
          </Button>
        </div>
        
        <!-- Description -->
        <div v-if="metadata?.description" class="text-white/70 text-sm leading-relaxed max-w-xl">
          {{ metadata.description }}
        </div>
      </div>
      
      <!-- Right Panel: Cover Art -->
      <div class="flex-shrink-0 w-80 p-12 flex flex-col items-end justify-end">
        <div class="w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
          <img 
            v-if="game?.coverUrl"
            :src="game.coverUrl"
            :alt="game.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
            <span class="text-4xl">🎮</span>
          </div>
        </div>
        
        <!-- Genres -->
        <div v-if="metadata?.genres" class="mt-4 text-right text-white/60 text-sm">
          {{ metadata.genres.join(' | ') }}
        </div>
      </div>
    </div>
    
    <!-- Settings Modal -->
    <GameSettingsModal 
      :show="showSettings" 
      :game-id="gameId"
      @close="showSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { Button, Badge } from '@/components/ui'
import GameSettingsModal from '@/components/game/GameSettingsModal.vue'
import type { Metadata } from '@/types'

const route = useRoute()
const libraryStore = useLibraryStore()

const gameId = computed(() => route.params.id as string)
const showSettings = ref(false)
const game = computed(() => {
  const g = libraryStore.games.find(g => g.id === gameId.value)
  if (g) {
    console.log('🎮 Game data:', {
      id: g.id,
      title: g.title,
      hasCover: !!g.coverUrl,
      hasBackground: !!g.backgroundUrl,
      coverUrl: g.coverUrl?.substring(0, 50),
      backgroundUrl: g.backgroundUrl?.substring(0, 50)
    })
  }
  return g
})
const metadata = ref<Metadata | null>(null)
const isPlaying = ref(false)
const installing = ref(false)
const metacriticScore = ref<number | null>(85) // TODO: Get from API

const achievements = computed(() => {
  // TODO: Get from API
  return '17/60 (29%)'
})

const completionStatus = computed(() => {
  if (!game.value?.playTime) return 'Not Played'
  if (game.value.playTime > 3600 * 20) return 'Played'
  return 'Started'
})

const formattedPlayTime = computed(() => {
  const minutes = game.value?.playTime || 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
})

const formattedLastPlayed = computed(() => {
  if (!game.value?.lastPlayed) return 'Never'
  return new Date(game.value.lastPlayed).toLocaleDateString()
})

async function playGame() {
  if (!game.value) return
  try {
    await libraryStore.launchGame(game.value.id)
    isPlaying.value = true
  } catch (error) {
    console.error('Failed to launch game:', error)
  }
}

async function installGame() {
  if (!game.value) return
  installing.value = true
  try {
    await libraryStore.installGame(game.value.id)
  } catch (error) {
    console.error('Failed to install game:', error)
  } finally {
    installing.value = false
  }
}

function returnToGame() {
  // TODO: Focus game window
}

function exitGame() {
  // TODO: Kill game process
  isPlaying.value = false
}

onMounted(async () => {
  // TODO: Fetch metadata from API
})
</script>
