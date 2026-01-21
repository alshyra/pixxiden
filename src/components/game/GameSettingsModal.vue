<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="show" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 border border-white/10">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white">Game Settings</h2>
            <button 
              class="text-white/60 hover:text-white transition-colors"
              @click="$emit('close')"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div v-if="config" class="space-y-4">
            <!-- Basic Info -->
            <div class="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <h3 class="text-sm font-semibold text-white/80 uppercase tracking-wide mb-2">Basic Information</h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-white/60 uppercase tracking-wide">Store</label>
                  <p class="text-white font-medium mt-1 capitalize">{{ config.store }}</p>
                </div>
                <div>
                  <label class="text-xs text-white/60 uppercase tracking-wide">Store ID</label>
                  <p class="text-white font-mono text-sm mt-1">{{ config.storeId }}</p>
                </div>
              </div>
              
              <div v-if="config.installed">
                <label class="text-xs text-white/60 uppercase tracking-wide">Install Path</label>
                <p class="text-white font-mono text-sm mt-1 break-all">{{ config.installPath || 'N/A' }}</p>
              </div>
            </div>
            
            <!-- Wine Config (Epic Games only) -->
            <div v-if="config.store === 'epic'" class="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <h3 class="text-sm font-semibold text-white/80 uppercase tracking-wide mb-2">Wine Configuration</h3>
              
              <div>
                <label class="text-xs text-white/60 uppercase tracking-wide">Wine Version</label>
                <p class="text-white font-medium mt-1">{{ config.wineVersion || 'Not configured' }}</p>
              </div>
              
              <div>
                <label class="text-xs text-white/60 uppercase tracking-wide">Wine Prefix</label>
                <p class="text-white font-mono text-sm mt-1 break-all">{{ config.winePrefix || 'Not configured' }}</p>
              </div>
              
              <div v-if="!config.winePrefix || !config.wineVersion" class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p class="text-yellow-400 text-sm">
                  <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  Wine configuration not found. Saves may not be loaded correctly. Configure this game in Heroic Launcher first.
                </p>
              </div>
            </div>
            
            <!-- Status -->
            <div class="bg-gray-800/50 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-white/80 uppercase tracking-wide mb-2">Status</h3>
              <div class="flex items-center gap-2">
                <div 
                  :class="config.installed ? 'bg-green-500' : 'bg-gray-600'"
                  class="w-2 h-2 rounded-full"
                />
                <span class="text-white">{{ config.installed ? 'Installed' : 'Not Installed' }}</span>
              </div>
            </div>
          </div>
          
          <!-- Loading State -->
          <div v-else class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          
          <!-- Actions -->
          <div class="mt-6 flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              @click="$emit('close')"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  show: boolean
  gameId: string
}

interface GameConfig {
  id: string
  title: string
  store: string
  storeId: string
  installPath: string | null
  winePrefix: string | null
  wineVersion: string | null
  installed: boolean
}

const props = defineProps<Props>()
defineEmits<{
  close: []
}>()

const config = ref<GameConfig | null>(null)

watch(() => props.show, async (show) => {
  if (show && props.gameId) {
    config.value = null
    try {
      config.value = await invoke<GameConfig>('get_game_config', { id: props.gameId })
    } catch (error) {
      console.error('Failed to load game config:', error)
    }
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
