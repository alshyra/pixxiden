import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/services/api'
import type { Game } from '@/types'

export const useLibraryStore = defineStore('library', () => {
  // All games (already enriched by backend)
  const games = ref<Game[]>([])
  const selectedGame = ref<Game | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const syncErrors = ref<string[]>([])
  const hasSynced = ref(false)

  // Computed: Get a game by ID
  const getGame = computed(() => (gameId: string) => {
    return games.value.find(g => g.id === gameId)
  })

  async function fetchGames() {
    console.log('🎮 fetchGames()')
    loading.value = true
    error.value = null
    try {
      // Backend returns already-enriched games
      const data = await api.getGames()
      console.log('🎮 Got', data.length, 'games')
      // If no games in DB and never synced, auto-sync
      if (data.length === 0 && !hasSynced.value) {
        console.log('🎮 No games, triggering sync...')
        await syncLibrary()
        return
      }
      games.value = data
    } catch (err) {
      error.value = 'Failed to fetch games'
      console.error('🎮 Error:', err)
    } finally {
      loading.value = false
    }
  }

  async function syncLibrary() {
    console.log('🎮 syncLibrary()')
    syncing.value = true
    loading.value = true
    error.value = null
    syncErrors.value = []
    try {
      const result = await api.syncGames()
      console.log('🎮 Sync result:', result)
      syncErrors.value = result.errors || []
      hasSynced.value = true
      // Refresh games after sync
      const data = await api.getGames()
      games.value = data
      console.log('🎮 Loaded', data.length, 'games')
    } catch (err) {
      error.value = 'Failed to sync library'
      console.error('🎮 Sync error:', err)
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

  async function scanGogInstalled() {
    console.log('🎮 scanGogInstalled()')
    loading.value = true
    error.value = null
    try {
      const gogGames = await api.scanGogInstalled()
      console.log('🎮 Found', gogGames.length, 'GOG games in ~/GOG Games/')
      
      // Merge with existing games
      const data = await api.getGames()
      games.value = data
      console.log('🎮 Total games:', data.length)
    } catch (err) {
      error.value = 'Failed to scan GOG games'
      console.error('🎮 Scan error:', err)
      throw err
    } finally {
      loading.value = false
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
    getGame,
    fetchGames,
    syncLibrary,
    scanGogInstalled,
    launchGame,
    installGame,
    uninstallGame,
    selectGameById,
  }
})
