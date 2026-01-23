/**
 * Test helpers for mocking Tauri commands with fixture data
 */

import { mockGames, getInstalledGames, getNotInstalledGames, getGamesByStore } from '../fixtures/mockGames'

/**
 * Setup mock for Tauri commands in browser context
 * This injects mock data into the window.__TAURI_INTERNALS__ object (Tauri v2)
 * 
 * IMPORTANT: We must serialize mockGames and pass it to browser.execute
 * because the browser context doesn't have access to Node.js variables
 */
export async function setupMockTauriCommands() {
  // Serialize mock data to pass to browser context
  const serializedMockGames = JSON.parse(JSON.stringify(mockGames))
  
  await browser.execute((mockGamesData) => {
    // Store mock data globally in browser context
    (window as any).__MOCK_GAMES__ = mockGamesData
    
    // @ts-ignore - Tauri v2 uses __TAURI_INTERNALS__
    if (!window.__TAURI_INTERNALS__) {
      // @ts-ignore
      window.__TAURI_INTERNALS__ = {
        transformCallback: (callback: Function, once?: boolean) => {
          const id = Math.random().toString(36).substr(2, 9)
          return id
        },
        unregisterCallback: (id: string) => {},
        convertFileSrc: (filePath: string, protocol?: string) => filePath,
      }
    }

    // Save original invoke if it exists
    const originalInvoke = (window as any).__TAURI_INTERNALS__?.invoke

    // @ts-ignore
    window.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: any, options?: any) => {
      const games = (window as any).__MOCK_GAMES__ || []
      console.log(`[Mock Tauri] Command: ${cmd}`, args)

      switch (cmd) {
        case 'get_games':
          // Return mock games data
          console.log(`[Mock Tauri] Returning ${games.length} games`)
          return games

        case 'sync_games':
          // Simulate sync success - return proper SyncResult format
          console.log(`[Mock Tauri] Sync returning ${games.length} games`)
          return { total_synced: games.length, errors: [] }

        case 'get_game':
          // Return specific game
          const gameId = args?.id
          const foundGame = games.find((g: any) => g.id === gameId)
          console.log(`[Mock Tauri] get_game ${gameId}:`, foundGame?.title)
          return foundGame || null

        case 'get_game_config':
          // Return game config for store-specific tests
          const configId = args?.id
          const game = games.find((g: any) => g.id === configId)
          if (game) {
            return {
              id: game.id,
              title: game.title,
              store: game.store,
              store_id: game.appId,
              installed: game.installed
            }
          }
          return null

        case 'launch_game':
          // Simulate game launch
          console.log(`[Mock] Launching game: ${args?.id}`)
          return { success: true }

        case 'install_game':
          // Simulate install
          console.log(`[Mock] Installing game: ${args?.id}`)
          return { success: true }

        case 'uninstall_game':
          // Simulate uninstall
          console.log(`[Mock] Uninstalling game: ${args?.id}`)
          return { success: true }

        case 'get_system_info':
          return {
            osName: 'Linux',
            kernelVersion: '6.1.0-test',
            cpuBrand: 'Intel Core i7-9700K',
            totalMemory: 17179869184, // 16GB
          }

        case 'get_disk_info':
          return [
            {
              mountPoint: '/',
              totalSpace: 500000000000,
              usedSpace: 250000000000,
            }
          ]

        case 'get_store_status':
          return [
            { name: 'epic', available: true, authenticated: false, username: '' },
            { name: 'gog', available: true, authenticated: false, username: '' },
            { name: 'amazon', available: true, authenticated: false, username: '' },
            { name: 'steam', available: true, authenticated: false, username: '' },
          ]

        case 'close_splashscreen':
          console.log('[Mock] Closing splashscreen')
          return null

        default:
          console.warn(`[Mock Tauri] Unhandled command: ${cmd}`)
          // Try original invoke if available
          if (originalInvoke) {
            return originalInvoke(cmd, args, options)
          }
          return null
      }
    }
    
    // Also set up legacy __TAURI__ for backwards compatibility
    // @ts-ignore
    if (!window.__TAURI__) {
      // @ts-ignore
      window.__TAURI__ = {}
    }
    // @ts-ignore
    window.__TAURI__.invoke = window.__TAURI_INTERNALS__.invoke
    
  }, serializedMockGames)
}

/**
 * Trigger library refresh after mocks are set up
 * This clicks the Sync button to reload games from the mocked backend
 */
export async function refreshLibrary() {
  // First wait for the button to appear
  await browser.waitUntil(
    async () => {
      const syncBtn = await $('button*=Synchroniser')
      return await syncBtn.isExisting()
    },
    { timeout: 5000, timeoutMsg: 'Synchroniser button did not appear' }
  )
  
  // Click the Synchroniser button to reload games
  const syncButton = await $('button*=Synchroniser')
  console.log('[Mock] Clicking Synchroniser button to load games')
  await syncButton.click()
  
  // Wait for sync to complete - check for spinner globally, not inside button
  await browser.waitUntil(
    async () => {
      const spinners = await $$('.animate-spin')
      return spinners.length === 0
    },
    { timeout: 10000, timeoutMsg: 'Sync took too long' }
  )
  
  // Additional wait for UI to update
  await browser.pause(1000)
}

/**
 * Inject mock games data into page
 * Alternative approach: directly populate store/state
 */
export async function injectMockGames() {
  const serializedMockGames = JSON.parse(JSON.stringify(mockGames))
  
  await browser.execute((games: any) => {
    // Store mock data in sessionStorage for persistence
    const gamesJson = JSON.stringify(games);
    sessionStorage.setItem('mockGames', gamesJson);
    
    // Store in window for access
    (window as any).__MOCK_GAMES__ = games;
    
    // Dispatch custom event to notify app
    const event = new CustomEvent('mock:games-loaded', { 
      detail: { games: games } 
    });
    window.dispatchEvent(event);
  }, serializedMockGames)
}

/**
 * Wait for mock data to be loaded in the app
 */
export async function waitForMockData() {
  await browser.waitUntil(
    async () => {
      const hasData = await browser.execute(() => {
        return sessionStorage.getItem('mockGames') !== null
      })
      return hasData
    },
    {
      timeout: 5000,
      timeoutMsg: 'Mock data was not loaded'
    }
  )
}

/**
 * Get mock game statistics for assertions
 */
export function getMockGameStats() {
  return {
    total: mockGames.length,
    installed: getInstalledGames().length,
    notInstalled: getNotInstalledGames().length,
    byStore: {
      epic: getGamesByStore('epic').length,
      gog: getGamesByStore('gog').length,
      amazon: getGamesByStore('amazon').length,
      steam: getGamesByStore('steam').length,
    }
  }
}

/**
 * Reset mock state between tests
 */
export async function resetMockState() {
  await browser.execute(() => {
    sessionStorage.removeItem('mockGames')
    sessionStorage.removeItem('mockGameState')
  })
}
