import type { Game, CacheStats } from '@/types'

// Import Tauri invoke - we'll wrap calls in try/catch for E2E compatibility
// The invoke function is lazy-loaded to avoid import errors in E2E tests
let _invoke: ((cmd: string, args?: any) => Promise<any>) | null = null

const getInvoke = async () => {
  if (_invoke) return _invoke
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    _invoke = invoke
    return invoke
  } catch (e) {
    console.warn('[API] Failed to import Tauri invoke (expected in E2E):', e)
    // Return a mock invoke that uses our mocked __TAURI_INTERNALS__
    _invoke = async (cmd: string, args?: any) => {
      if ((window as any).__TAURI_INTERNALS__?.invoke) {
        return (window as any).__TAURI_INTERNALS__.invoke(cmd, args)
      }
      throw new Error(`Tauri command '${cmd}' not available`)
    }
    return _invoke
  }
}

// Wrapper to safely call invoke
const invoke = async <T>(cmd: string, args?: any): Promise<T> => {
  const fn = await getInvoke()
  return fn(cmd, args)
}

// Mock mode - can be enabled via localStorage, URL param, or E2E test injection
const isMockMode = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check if E2E tests injected mock games
    if ((window as any).__MOCK_GAMES__) return true
    
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('mock')) return true
    
    // Check localStorage
    try {
      return localStorage.getItem('PIXXIDEN_MOCK_MODE') === 'true'
    } catch {
      return false
    }
  }
  return false
}

// Enable mock mode programmatically
export const enableMockMode = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('PIXXIDEN_MOCK_MODE', 'true')
  }
}

export const disableMockMode = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem('PIXXIDEN_MOCK_MODE')
  }
}

// Import mock games (will be tree-shaken in production if not used)
let mockGamesData: Game[] | null = null

// Enrich raw mock games with realistic test data
const enrichMockGames = (games: any[]): Game[] => {
  // Realistic enriched data for specific games
  const enrichedData: Record<string, Partial<Game>> = {
    '1': { // DREDGE
      genres: ['Adventure', 'Indie', 'Simulation'],
      developer: 'Black Salt Games',
      publisher: 'Team17',
      releaseDate: '2023-03-30',
      metacriticScore: 84,
      igdbRating: 82,
      hltbMain: 12,
      hltbMainExtra: 18,
      hltbComplete: 25,
      protonTier: 'platinum',
      achievementsTotal: 45,
      achievementsUnlocked: 28,
      description: 'A single-player fishing adventure with a sinister undercurrent. Explore a mysterious archipelago and discover why some things are best left forgotten.',
    },
    '2': { // Call of Duty
      genres: ['Shooter', 'Action'],
      developer: 'Infinity Ward',
      publisher: 'Activision',
      releaseDate: '2003-10-29',
      metacriticScore: 91,
      igdbRating: 88,
      hltbMain: 7,
      hltbMainExtra: 9,
      hltbComplete: 12,
      protonTier: 'gold',
      achievementsTotal: 36,
      achievementsUnlocked: 0,
      description: 'Call of Duty delivers the gritty realism and cinematic intensity of World War II\'s epic battlefield moments.',
    },
    '3': { // Fortnite
      genres: ['Shooter', 'Battle Royale', 'Action'],
      developer: 'Epic Games',
      publisher: 'Epic Games',
      releaseDate: '2017-07-25',
      metacriticScore: 81,
      igdbRating: 76,
      hltbMain: 0, // No story mode
      hltbMainExtra: 0,
      hltbComplete: 0,
      protonTier: 'borked',
      achievementsTotal: 0,
      achievementsUnlocked: 0,
      description: 'The action building game where you team up with other players to build massive forts and battle against hordes of monsters.',
    },
    '4': { // Sea of Thieves
      genres: ['Action', 'Adventure', 'Multiplayer'],
      developer: 'Rare',
      publisher: 'Xbox Game Studios',
      releaseDate: '2018-03-20',
      metacriticScore: 69,
      igdbRating: 71,
      hltbMain: 15,
      hltbMainExtra: 45,
      hltbComplete: 120,
      protonTier: 'silver',
      achievementsTotal: 189,
      achievementsUnlocked: 42,
      description: 'A pirate adventure game that lets you explore an open world via a pirate ship from a first-person perspective.',
    },
    '7': { // Red Dead Redemption 2
      genres: ['Action', 'Adventure', 'Shooter'],
      developer: 'Rockstar Games',
      publisher: 'Rockstar Games',
      releaseDate: '2018-10-26',
      metacriticScore: 97,
      igdbRating: 93,
      hltbMain: 50,
      hltbMainExtra: 79,
      hltbComplete: 173,
      protonTier: 'gold',
      achievementsTotal: 59,
      achievementsUnlocked: 35,
      description: 'America, 1899. The end of the Wild West era has begun. After a robbery goes badly wrong, Arthur Morgan must fight to survive against rival gangs, natural forces, and his own inner demons.',
    },
  }

  return games.map(game => {
    const enrichment = enrichedData[game.id] || {}
    return {
      ...game,
      genres: enrichment.genres ?? [],
      developer: enrichment.developer,
      publisher: enrichment.publisher,
      releaseDate: enrichment.releaseDate,
      description: enrichment.description ?? game.description,
      metacriticScore: enrichment.metacriticScore,
      igdbRating: enrichment.igdbRating,
      hltbMain: enrichment.hltbMain,
      hltbMainExtra: enrichment.hltbMainExtra,
      hltbComplete: enrichment.hltbComplete,
      protonTier: enrichment.protonTier,
      achievementsTotal: enrichment.achievementsTotal,
      achievementsUnlocked: enrichment.achievementsUnlocked,
      playTimeMinutes: game.playTime ?? game.playTimeMinutes ?? 0,
      createdAt: game.createdAt ?? new Date().toISOString(),
      updatedAt: game.updatedAt ?? new Date().toISOString(),
    }
  })
}

// Lazy load mock games (returns already enriched games)
const getMockGames = async (): Promise<Game[]> => {
  // Check for mock games injected by E2E tests first (in window)
  if (typeof window !== 'undefined' && (window as any).__MOCK_GAMES__) {
    console.log('🎮 [MOCK] Using window.__MOCK_GAMES__')
    return enrichMockGames((window as any).__MOCK_GAMES__)
  }
  
  // Check for mock games stored in localStorage (survives page reload)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('PIXXIDEN_MOCK_GAMES')
      if (stored) {
        const games = JSON.parse(stored)
        console.log('🎮 [MOCK] Using localStorage PIXXIDEN_MOCK_GAMES:', games.length, 'games')
        return enrichMockGames(games)
      }
    } catch (e) {
      console.error('🎮 [MOCK] Failed to parse localStorage mock games:', e)
    }
  }
  
  if (mockGamesData !== null) {
    return mockGamesData
  }
  
  if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
    const module = await import('../../e2e/fixtures/mockGames')
    mockGamesData = enrichMockGames(module.mockGames)
    return mockGamesData
  }
  
  return []
}

// Types for Tauri responses
interface SyncResult {
  total_synced: number
  errors: string[]
}

interface StoreStatus {
  id: string
  name: string
  available: boolean
  authenticated: boolean
  cli_tool: string
}

interface SystemInfo {
  osName: string
  osVersion: string
  kernelVersion: string
  cpuBrand: string
  totalMemory: number
  hostname: string
}

interface DiskInfo {
  name: string
  mountPoint: string
  totalSpace: number
  availableSpace: number
  usedSpace: number
  fileSystem: string
  isRemovable: boolean
}

interface SettingsConfig {
  protonVersion: string
  mangoHudEnabled: boolean
  defaultInstallPath: string
  winePrefixPath: string
}

// Games API - Direct IPC calls to Rust backend
// Backend automatically enriches games with metadata - frontend just gets Game objects

export async function getGames(): Promise<Game[]> {
  if (isMockMode()) {
    const mockData = await getMockGames()
    console.log('🎮 [MOCK MODE] Returning mock games:', mockData.length)
    return mockData
  }
  
  try {
    // Backend returns already-enriched games
    const games = await invoke<Game[]>('get_games')
    return games
  } catch (error) {
    console.error('Failed to get games:', error)
    throw error
  }
}

export async function getGame(gameId: string): Promise<Game | null> {
  if (isMockMode()) {
    const mockData = await getMockGames()
    const game = mockData.find(g => g.id === gameId) || null
    console.log(`🎮 [MOCK MODE] getGame(${gameId}):`, game?.title || 'not found')
    return game
  }
  
  try {
    const game = await invoke<Game | null>('get_game', { id: gameId })
    return game
  } catch (error) {
    console.error('Failed to get game:', error)
    throw error
  }
}

/**
 * Clear cache for a specific game
 */
export async function clearGameCache(gameId: string): Promise<void> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] clearGameCache:', gameId)
    return
  }
  
  try {
    await invoke('clear_game_cache', { gameId })
  } catch (error) {
    console.error('Failed to clear game cache:', error)
    throw error
  }
}

/**
 * Clear all game cache (metadata + assets)
 */
export async function clearAllCache(): Promise<void> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] clearAllCache')
    return
  }
  
  try {
    await invoke('clear_all_cache')
  } catch (error) {
    console.error('Failed to clear all cache:', error)
    throw error
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] getCacheStats')
    return {
      gamesCount: 10,
      totalAssetsCount: 40,
      totalAssetsSizeMb: 125.5,
      cacheDir: '~/.local/share/pixxiden'
    }
  }
  
  try {
    const stats = await invoke<CacheStats>('get_cache_stats')
    return stats
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    throw error
  }
}

export async function syncGames(): Promise<SyncResult> {
  if (isMockMode()) {
    const mockData = await getMockGames()
    console.log('🎮 [MOCK MODE] Syncing mock games')
    return Promise.resolve({
      total_synced: mockData.length,
      errors: []
    })
  }
  
  try {
    const result = await invoke<SyncResult>('sync_games')
    return result
  } catch (error) {
    console.error('Failed to sync games:', error)
    throw error
  }
}

export async function scanGogInstalled(): Promise<Game[]> {
  try {
    const games = await invoke<Game[]>('scan_gog_installed')
    return games
  } catch (error) {
    console.error('Failed to scan GOG installed games:', error)
    throw error
  }
}

export async function launchGame(gameId: string): Promise<void> {
  try {
    await invoke('launch_game', { id: gameId })
  } catch (error) {
    console.error('Failed to launch game:', error)
    throw error
  }
}

export async function installGame(gameId: string, installPath?: string): Promise<void> {
  try {
    await invoke('install_game', { id: gameId })
  } catch (error) {
    console.error('Failed to install game:', error)
    throw error
  }
}

export async function uninstallGame(gameId: string): Promise<void> {
  try {
    await invoke('uninstall_game', { id: gameId })
  } catch (error) {
    console.error('Failed to uninstall game:', error)
    throw error
  }
}

// Store API

export async function getStoreStatus(): Promise<StoreStatus[]> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock store status')
    return [
      { id: 'epic', name: 'Epic Games', available: true, authenticated: false, cli_tool: 'legendary' },
      { id: 'gog', name: 'GOG Galaxy', available: true, authenticated: false, cli_tool: 'gogdl' },
      { id: 'amazon', name: 'Amazon Games', available: true, authenticated: false, cli_tool: 'nile' },
      { id: 'steam', name: 'Steam', available: true, authenticated: false, cli_tool: 'steam' },
    ]
  }
  
  try {
    const stores = await invoke<StoreStatus[]>('get_store_status')
    return stores
  } catch (error) {
    console.error('Failed to get store status:', error)
    throw error
  }
}

// Legacy compatibility functions
export async function authenticateLegendary(): Promise<void> {
  console.warn('authenticateLegendary: Run "legendary auth" in terminal')
}

export async function checkLegendaryStatus(): Promise<{ authenticated: boolean }> {
  const stores = await getStoreStatus()
  const epic = stores.find(s => s.id === 'epic')
  return { authenticated: epic?.authenticated ?? false }
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  // With Tauri, we're always "healthy" if this code runs
  return { status: 'ok', version: '0.1.0' }
}

// System API

export async function getSystemInfo(): Promise<SystemInfo> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock system info')
    return {
      osName: 'Linux',
      osVersion: 'Fedora 39',
      kernelVersion: '6.6.0-test',
      cpuBrand: 'Intel Core i7-9700K @ 3.60GHz',
      totalMemory: 17179869184, // 16GB
      hostname: 'pixxiden-test'
    }
  }
  
  try {
    const info = await invoke<SystemInfo>('get_system_info')
    return info
  } catch (error) {
    console.error('Failed to get system info:', error)
    throw error
  }
}

export async function getDiskInfo(): Promise<DiskInfo[]> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock disk info')
    return [
      {
        name: 'nvme0n1p3',
        mountPoint: '/',
        totalSpace: 500000000000, // 500GB
        availableSpace: 250000000000, // 250GB
        usedSpace: 250000000000, // 250GB
        fileSystem: 'ext4',
        isRemovable: false
      },
      {
        name: 'sda1',
        mountPoint: '/home',
        totalSpace: 1000000000000, // 1TB
        availableSpace: 600000000000, // 600GB
        usedSpace: 400000000000, // 400GB
        fileSystem: 'ext4',
        isRemovable: false
      }
    ]
  }
  
  try {
    const disks = await invoke<DiskInfo[]>('get_disk_info')
    return disks
  } catch (error) {
    console.error('Failed to get disk info:', error)
    throw error
  }
}

export async function checkForUpdates(): Promise<boolean> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock update check (no updates)')
    return false
  }
  
  try {
    const hasUpdate = await invoke<boolean>('check_for_updates')
    return hasUpdate
  } catch (error) {
    console.error('Failed to check for updates:', error)
    throw error
  }
}

export async function shutdownSystem(): Promise<void> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Mock shutdown (no-op)')
    return
  }
  
  try {
    await invoke('shutdown_system')
  } catch (error) {
    console.error('Failed to shutdown system:', error)
    throw error
  }
}

export async function getSettings(): Promise<SettingsConfig> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock settings')
    return {
      protonVersion: 'ge-proton-8-32',
      mangoHudEnabled: false,
      defaultInstallPath: '~/Games',
      winePrefixPath: '~/.local/share/pixxiden/prefixes'
    }
  }
  
  try {
    const settings = await invoke<SettingsConfig>('get_settings')
    return settings
  } catch (error) {
    console.error('Failed to get settings:', error)
    throw error
  }
}

export async function saveSettings(config: SettingsConfig): Promise<void> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Mock save settings:', config)
    return
  }
  
  try {
    await invoke('save_settings', { config })
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

export interface GameConfig {
  id: string
  title: string
  store: string
  storeId: string
  installPath: string | null
  winePrefix: string | null
  wineVersion: string | null
  installed: boolean
  downloadSize?: number  // Size in bytes
  version?: string       // Game version
}

export async function getGameConfig(id: string): Promise<GameConfig> {
  if (isMockMode()) {
    console.log('🎮 [MOCK MODE] Returning mock game config for:', id)
    const games = await getMockGames()
    const game = games.find(g => g.id === id)
    
    if (!game) {
      throw new Error(`Game ${id} not found`)
    }
    
    // Mock download sizes (in bytes)
    const mockSizes: Record<string, number> = {
      '1': 75 * 1024 * 1024 * 1024,    // Cyberpunk: 75 GB
      '2': 150 * 1024 * 1024 * 1024,   // Hogwarts: 150 GB
      '3': 50 * 1024 * 1024 * 1024,    // Hades: 50 GB
      '11': 150 * 1024 * 1024 * 1024,  // Hogwarts Legacy: 150 GB
    }
    
    return {
      id: game.id,
      title: game.title,
      store: game.store,
      storeId: game.storeId || game.id,
      installPath: game.installed ? `/home/user/Games/${game.title}` : null,
      winePrefix: game.store === 'epic' ? `/home/user/.local/share/pixxiden/prefixes/${game.id}` : null,
      wineVersion: game.store === 'epic' ? 'ge-proton-8-32' : null,
      installed: game.installed || false,
      downloadSize: mockSizes[game.id] || 30 * 1024 * 1024 * 1024, // Default 30 GB
      version: '1.0.0'
    }
  }
  
  try {
    const config = await invoke<GameConfig>('get_game_config', { id })
    return config
  } catch (error) {
    console.error('Failed to get game config:', error)
    throw error
  }
}

export type { SystemInfo, DiskInfo, SettingsConfig, StoreStatus, SyncResult }
