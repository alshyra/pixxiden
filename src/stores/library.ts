import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/services/api'
import { demoGames } from '@/composables/useDemoGames'
import type { Game } from '@/types'

// Use demo mode when Tauri is unavailable (e.g., browser dev)
const USE_DEMO_MODE = !('__TAURI__' in window)

export const useLibraryStore = defineStore('library', () => {
  const games = ref<Game[]>([])
  const selectedGame = ref<Game | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const syncErrors = ref<string[]>([])
  const hasSynced = ref(false)

  async function fetchGames() {
    loading.value = true
    error.value = null
    try {
      if (USE_DEMO_MODE) {
        // Demo mode for browser development
        await new Promise(resolve => setTimeout(resolve, 300))
        games.value = demoGames
      } else {
        const data = await api.getGames()
        // If no games in DB and never synced, auto-sync
        if (data.length === 0 && !hasSynced.value) {
          console.log('No games found, triggering initial sync...')
          await syncLibrary()
          return
        }
        games.value = data
      }
    } catch (err) {
      error.value = 'Failed to fetch games'
      console.error(err)
      // Fallback to demo data on error
      games.value = demoGames
    } finally {
      loading.value = false
    }
  }

  async function syncLibrary() {
    syncing.value = true
    loading.value = true
    error.value = null
    syncErrors.value = []
    try {
      if (USE_DEMO_MODE) {
        // Demo mode - simulate sync
        await new Promise(resolve => setTimeout(resolve, 1000))
        games.value = demoGames
      } else {
        console.log('Syncing games from stores...')
        const result = await api.syncGames()
        console.log('Sync result:', result)
        syncErrors.value = result.errors || []
        hasSynced.value = true
        // Refresh games after sync
        const data = await api.getGames()
        games.value = data
        console.log(`Loaded ${data.length} games from database`)
      }
    } catch (err) {
      error.value = 'Failed to sync library'
      console.error('Sync error:', err)
      // Show demo games as fallback
      if (games.value.length === 0) {
        games.value = demoGames
      }
    } finally {
      loading.value = false
      syncing.value = false
    }
  }

  async function launchGame(gameId: string) {
    try {
      await api.launchGame(gameId)
      
      // Update last played
      const game = games.value.find(g => g.id === gameId)
      if (game) {
        game.lastPlayed = new Date().toISOString()
      }
    } catch (err) {
      error.value = 'Failed to launch game'
      console.error(err)
      throw err
    }
  }

  async function installGame(gameId: string, installPath?: string) {
    try {
      const game = games.value.find(g => g.id === gameId || g.appId === gameId)
      if (game) {
        game.downloading = true
        game.downloadProgress = 0
      }
      
      // TODO: Implement actual install logic with progress tracking
      await api.installGame(gameId, installPath)
    } catch (err) {
      error.value = 'Failed to install game'
      console.error(err)
      throw err
    }
  }

  async function uninstallGame(gameId: string) {
    try {
      await api.uninstallGame(gameId)
      
      // Update game state
      const game = games.value.find(g => g.id === gameId || g.appId === gameId)
      if (game) {
        game.installed = false
        game.installPath = ''
      }
    } catch (err) {
      error.value = 'Failed to uninstall game'
      console.error(err)
      throw err
    }
  }

  function selectGameById(gameId: string) {
    selectedGame.value = games.value.find(g => g.id === gameId) || null
  }

  return {
    games,
    selectedGame,
    loading,
    syncing,
    error,
    syncErrors,
    fetchGames,
    syncLibrary,
    launchGame,
    installGame,
    uninstallGame,
    selectGameById,
  }
})
