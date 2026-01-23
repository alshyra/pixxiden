import { invoke } from '@tauri-apps/api/core'
import type { Game } from '@/types'

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

// Lazy load mock games
const getMockGames = async (): Promise<Game[]> => {
  // Check for mock games injected by E2E tests first
  if (typeof window !== 'undefined' && (window as any).__MOCK_GAMES__) {
    console.log('🎮 [MOCK] Using window.__MOCK_GAMES__')
    return (window as any).__MOCK_GAMES__
  }
  
  if (mockGamesData !== null) {
    return mockGamesData
  }
  
  if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
    const module = await import('../../e2e/fixtures/mockGames')
    mockGamesData = module.mockGames
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

export async function getGames(): Promise<Game[]> {
  if (isMockMode()) {
    const mockData = await getMockGames()
    console.log('🎮 [MOCK MODE] Returning mock games:', mockData.length)
    return Promise.resolve([...mockData])
  }
  
  try {
    const games = await invoke<Game[]>('get_games')
    return games
  } catch (error) {
    console.error('Failed to get games:', error)
    throw error
  }
}

export async function getGame(gameId: string): Promise<Game | null> {
  try {
    const game = await invoke<Game | null>('get_game', { id: gameId })
    return game
  } catch (error) {
    console.error('Failed to get game:', error)
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
  try {
    const info = await invoke<SystemInfo>('get_system_info')
    return info
  } catch (error) {
    console.error('Failed to get system info:', error)
    throw error
  }
}

export async function getDiskInfo(): Promise<DiskInfo[]> {
  try {
    const disks = await invoke<DiskInfo[]>('get_disk_info')
    return disks
  } catch (error) {
    console.error('Failed to get disk info:', error)
    throw error
  }
}

export async function checkForUpdates(): Promise<boolean> {
  try {
    const hasUpdate = await invoke<boolean>('check_for_updates')
    return hasUpdate
  } catch (error) {
    console.error('Failed to check for updates:', error)
    throw error
  }
}

export async function shutdownSystem(): Promise<void> {
  try {
    await invoke('shutdown_system')
  } catch (error) {
    console.error('Failed to shutdown system:', error)
    throw error
  }
}

export async function getSettings(): Promise<SettingsConfig> {
  try {
    const settings = await invoke<SettingsConfig>('get_settings')
    return settings
  } catch (error) {
    console.error('Failed to get settings:', error)
    throw error
  }
}

export async function saveSettings(config: SettingsConfig): Promise<void> {
  try {
    await invoke('save_settings', { config })
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

export type { SystemInfo, DiskInfo, SettingsConfig, StoreStatus, SyncResult }
