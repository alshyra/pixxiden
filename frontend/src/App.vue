<template>
  <div id="app" class="min-h-screen bg-remix-bg-dark text-remix-text-primary">
    <!-- Navigation Bar -->
    <nav class="bg-remix-bg-card border-b border-remix-border">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-remix-accent to-remix-accent-hover rounded-lg flex items-center justify-center">
              <span class="text-white text-xl">🎮</span>
            </div>
            <h1 class="text-2xl font-display font-bold">PixiDen</h1>
          </div>

          <!-- Navigation Links -->
          <div class="flex items-center space-x-6">
            <router-link 
              to="/" 
              class="hover:text-remix-accent transition-colors"
              active-class="text-remix-accent">
              Library
            </router-link>
            <router-link 
              to="/downloads" 
              class="hover:text-remix-accent transition-colors"
              active-class="text-remix-accent">
              Downloads
            </router-link>
            <router-link 
              to="/settings" 
              class="hover:text-remix-accent transition-colors"
              active-class="text-remix-accent">
              Settings
            </router-link>
          </div>

          <!-- Search -->
          <div class="relative">
            <input 
              type="text" 
              placeholder="Search games..." 
              v-model="searchQuery"
              class="bg-remix-bg-hover border border-remix-border rounded-lg pl-4 pr-4 py-2 
                     text-remix-text-primary placeholder-remix-text-secondary
                     focus:outline-none focus:ring-2 focus:ring-remix-accent focus:border-transparent
                     transition-all w-64"
            />
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
      <router-view />
    </main>

    <!-- Status Bar (bottom) -->
    <div class="fixed bottom-0 left-0 right-0 bg-remix-bg-card border-t border-remix-border px-6 py-3">
      <div class="flex items-center justify-between text-sm text-remix-text-secondary">
        <div class="flex items-center space-x-4">
          <span>{{ totalGames }} games</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full bg-remix-success"></div>
          <span>Connected</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/library'

const libraryStore = useLibraryStore()

const searchQuery = ref('')

const totalGames = computed(() => libraryStore.games.length)
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1A1A1D;
}

::-webkit-scrollbar-thumb {
  background: #2A2A2F;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3A3A3F;
}
</style>
