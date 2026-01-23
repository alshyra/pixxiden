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
 * This forces the Vue app to re-fetch games using mocked invoke
 * 
 * NOTE: We can't use browser.refresh() with Tauri WebDriver as it breaks the session.
 * Instead, we set up mocks and force the store to re-fetch.
 */
export async function refreshLibrary() {
  const serializedMockGames = JSON.parse(JSON.stringify(mockGames))
  
  console.log(`[Mock] refreshLibrary: Starting with ${serializedMockGames.length} mock games`)
  
  // First, set up mocks (this ensures __MOCK_GAMES__ and __TAURI_INTERNALS__ are set)
  await setupMockTauriCommands()
  
  // Also store in localStorage for persistence
  await browser.execute((games: any[]) => {
    (window as any).__MOCK_GAMES__ = games
    localStorage.setItem('PIXXIDEN_MOCK_GAMES', JSON.stringify(games))
    localStorage.setItem('PIXXIDEN_MOCK_MODE', 'true')
    console.log('[Mock] Mock games stored:', games.length, 'games')
  }, serializedMockGames)
  
  // Force the library store to re-fetch by calling fetchGames directly
  console.log('[Mock] refreshLibrary: Calling store.fetchGames() directly...')
  const fetchResult = await browser.execute(async () => {
    const pinia = (window as any).__PINIA__
    if (!pinia?._s?.has('library')) {
      console.error('[Mock] Library store not found in Pinia')
      return { success: false, error: 'No library store' }
    }
    
    const store = pinia._s.get('library')
    try {
      console.log('[Mock] Calling fetchGames...')
      await store.fetchGames()
      console.log('[Mock] fetchGames complete, games:', store.games?.length)
      return { success: true, gamesCount: store.games?.length || 0 }
    } catch (e: any) {
      console.error('[Mock] fetchGames error:', e)
      return { success: false, error: e.message }
    }
  })
  
  console.log(`[Mock] refreshLibrary: fetchGames result:`, fetchResult)
  
  // Wait a bit for Vue reactivity
  await browser.pause(500)
  
  // Verify state
  const result = await browser.execute(() => {
    const mockGames = localStorage.getItem('PIXXIDEN_MOCK_GAMES')
    const mockMode = localStorage.getItem('PIXXIDEN_MOCK_MODE')
    const pinia = (window as any).__PINIA__
    let storeGames = 0
    let storeLoading = false
    let storeError = null
    if (pinia?._s?.has('library')) {
      const store = pinia._s.get('library')
      storeGames = store?.games?.length || 0
      storeLoading = store?.loading || false
      storeError = store?.error || null
    }
    return { 
      mockGamesInStorage: mockGames ? JSON.parse(mockGames).length : 0, 
      mockModeEnabled: mockMode === 'true',
      storeGamesCount: storeGames,
      storeLoading,
      storeError,
      hasPinia: !!pinia
    }
  })
  
  console.log(`[Mock] refreshLibrary: Complete. Storage=${result.mockGamesInStorage}, MockMode=${result.mockModeEnabled}, StoreGames=${result.storeGamesCount}, Loading=${result.storeLoading}, Error=${result.storeError}, Pinia=${result.hasPinia}`)
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
      timeout: 2000,
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
