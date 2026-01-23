/**
 * Pixxiden E2E Tests - Store Loading
 * 
 * Tests loading games from mock store data:
 * - Legendary (Epic Games Store)
 * - GOGDL (GOG.com)
 * - Nile (Amazon Games)
 * 
 * Uses mock data to avoid requiring actual store binaries and authentication.
 */

import { 
  waitForAppReady, 
  takeScreenshot,
  setupMockTauriCommands,
  injectMockGames,
  getMockGameStats 
} from '../helpers'

describe('Store Integration', () => {
  before(async () => {
    await waitForAppReady()
    
    // Setup mock Tauri commands and inject mock games
    await setupMockTauriCommands()
    await injectMockGames()
    
    const stats = getMockGameStats()
    console.log('Mock game stats:', JSON.stringify(stats, null, 2))
  })

  describe('Store Game Distribution', () => {
    it('should have games from Epic Games Store', async () => {
      const stats = getMockGameStats()
      
      expect(stats.byStore.epic).toBeGreaterThan(0)
      console.log(`Epic Games count: ${stats.byStore.epic}`)
      
      await takeScreenshot('store-epic-games')
    })

    it('should have games from GOG', async () => {
      const stats = getMockGameStats()
      
      expect(stats.byStore.gog).toBeGreaterThan(0)
      console.log(`GOG Games count: ${stats.byStore.gog}`)
      
      await takeScreenshot('store-gog-games')
    })

    it('should have games from Amazon Games', async () => {
      const stats = getMockGameStats()
      
      expect(stats.byStore.amazon).toBeGreaterThan(0)
      console.log(`Amazon Games count: ${stats.byStore.amazon}`)
      
      await takeScreenshot('store-amazon-games')
    })

    it('should have correct total game count across all stores', async () => {
      const stats = getMockGameStats()
      const totalByStore = stats.byStore.epic + stats.byStore.gog + stats.byStore.amazon
      
      expect(totalByStore).toBe(stats.total)
      console.log(`Total games: ${stats.total}`)
    })

    it('should distinguish between installed and not installed games', async () => {
      const stats = getMockGameStats()
      const totalGames = stats.installed + stats.notInstalled
      
      expect(totalGames).toBe(stats.total)
      console.log(`Installed: ${stats.installed}, Not installed: ${stats.notInstalled}`)
    })
  })

  after(async () => {
    await takeScreenshot('store-loading-final')
  })
})
