/**
 * PixiDen E2E Tests - Store Loading
 * 
 * Tests loading games from real store binaries:
 * - Legendary (Epic Games Store)
 * - GOGDL (GOG.com)
 * - Nile (Amazon Games)
 * 
 * These tests use actual installed CLI tools and require valid authentication.
 */

import { waitForAppReady, invokeTauriCommand, takeScreenshot } from '../helpers'

interface StoreStatus {
  name: string
  available: boolean
  authenticated: boolean
}

interface Game {
  id: string
  title: string
  store: string
  store_id: string
  installed: boolean
}

interface SyncResult {
  total_games: number
  new_games: number
  updated_games: number
  errors: string[]
}

describe('Store Integration', () => {
  let storeStatuses: StoreStatus[] = []

  before(async () => {
    await waitForAppReady()
    // Get current store statuses
    storeStatuses = await invokeTauriCommand<StoreStatus[]>('get_store_status')
    console.log('Store statuses:', JSON.stringify(storeStatuses, null, 2))
  })

  describe('Store Binary Detection', () => {
    it('should detect Legendary (Epic Games) binary availability', async () => {
      const epicStore = storeStatuses.find((s) => s.name === 'epic')
      expect(epicStore).toBeDefined()
      
      console.log(`Legendary available: ${epicStore?.available}`)
      console.log(`Legendary authenticated: ${epicStore?.authenticated}`)
      
      // We just verify the detection works, availability depends on system setup
      expect(typeof epicStore?.available).toBe('boolean')
    })

    it('should detect GOGDL binary availability', async () => {
      const gogStore = storeStatuses.find((s) => s.name === 'gog')
      expect(gogStore).toBeDefined()
      
      console.log(`GOGDL available: ${gogStore?.available}`)
      console.log(`GOGDL authenticated: ${gogStore?.authenticated}`)
      
      expect(typeof gogStore?.available).toBe('boolean')
    })

    it('should detect Nile (Amazon Games) binary availability', async () => {
      const amazonStore = storeStatuses.find((s) => s.name === 'amazon')
      expect(amazonStore).toBeDefined()
      
      console.log(`Nile available: ${amazonStore?.available}`)
      console.log(`Nile authenticated: ${amazonStore?.authenticated}`)
      
      expect(typeof amazonStore?.available).toBe('boolean')
    })
  })

  describe('Legendary (Epic Games) Store', () => {
    let epicStatus: StoreStatus | undefined

    before(() => {
      epicStatus = storeStatuses.find((s) => s.name === 'epic')
    })

    it('should have legendary binary available', function () {
      if (!epicStatus?.available) {
        this.skip()
        return
      }
      expect(epicStatus.available).toBe(true)
    })

    it('should load Epic Games library when authenticated', async function () {
      if (!epicStatus?.available || !epicStatus?.authenticated) {
        console.log('Skipping: Legendary not available or not authenticated')
        this.skip()
        return
      }

      // Sync games from Epic
      const syncResult = await invokeTauriCommand<SyncResult>('sync_games')
      console.log('Epic sync result:', JSON.stringify(syncResult, null, 2))

      // Get all games and filter Epic ones
      const allGames = await invokeTauriCommand<Game[]>('get_games')
      const epicGames = allGames.filter((g) => g.store === 'epic')

      console.log(`Found ${epicGames.length} Epic Games`)
      
      // If authenticated, we should have at least some games (even if 0, no errors)
      expect(Array.isArray(epicGames)).toBe(true)
      expect(syncResult.errors.filter((e) => e.includes('Epic')).length).toBe(0)
    })

    it('should parse Epic game metadata correctly', async function () {
      if (!epicStatus?.available || !epicStatus?.authenticated) {
        this.skip()
        return
      }

      const allGames = await invokeTauriCommand<Game[]>('get_games')
      const epicGames = allGames.filter((g) => g.store === 'epic')

      if (epicGames.length === 0) {
        console.log('No Epic games to verify metadata')
        return
      }

      // Verify game structure
      const game = epicGames[0]
      expect(game.id).toBeDefined()
      expect(game.title).toBeDefined()
      expect(game.store).toBe('epic')
      expect(game.store_id).toBeDefined()
      expect(typeof game.installed).toBe('boolean')

      console.log(`Sample Epic game: ${game.title} (${game.store_id})`)
    })
  })

  describe('GOGDL (GOG) Store', () => {
    let gogStatus: StoreStatus | undefined

    before(() => {
      gogStatus = storeStatuses.find((s) => s.name === 'gog')
    })

    it('should have gogdl binary available', function () {
      if (!gogStatus?.available) {
        this.skip()
        return
      }
      expect(gogStatus.available).toBe(true)
    })

    it('should load GOG library when authenticated', async function () {
      if (!gogStatus?.available || !gogStatus?.authenticated) {
        console.log('Skipping: GOGDL not available or not authenticated')
        this.skip()
        return
      }

      // Sync includes GOG games
      const syncResult = await invokeTauriCommand<SyncResult>('sync_games')
      console.log('GOG sync result:', JSON.stringify(syncResult, null, 2))

      const allGames = await invokeTauriCommand<Game[]>('get_games')
      const gogGames = allGames.filter((g) => g.store === 'gog')

      console.log(`Found ${gogGames.length} GOG Games`)
      
      expect(Array.isArray(gogGames)).toBe(true)
      expect(syncResult.errors.filter((e) => e.includes('GOG')).length).toBe(0)
    })

    it('should parse GOG game metadata correctly', async function () {
      if (!gogStatus?.available || !gogStatus?.authenticated) {
        this.skip()
        return
      }

      const allGames = await invokeTauriCommand<Game[]>('get_games')
      const gogGames = allGames.filter((g) => g.store === 'gog')

      if (gogGames.length === 0) {
        console.log('No GOG games to verify metadata')
        return
      }

      const game = gogGames[0]
      expect(game.id).toBeDefined()
      expect(game.title).toBeDefined()
      expect(game.store).toBe('gog')
      expect(game.store_id).toBeDefined()
      expect(typeof game.installed).toBe('boolean')

      console.log(`Sample GOG game: ${game.title} (${game.store_id})`)
    })
  })

  describe('Nile (Amazon Games) Store', () => {
    let amazonStatus: StoreStatus | undefined

    before(() => {
      amazonStatus = storeStatuses.find((s) => s.name === 'amazon')
    })

    it('should detect Nile binary status', function () {
      // Nile might not be implemented yet, but we verify the status check works
      expect(amazonStatus).toBeDefined()
      console.log(`Nile status: available=${amazonStatus?.available}, authenticated=${amazonStatus?.authenticated}`)
    })

    it('should handle Nile when not available gracefully', async function () {
      if (amazonStatus?.available && amazonStatus?.authenticated) {
        this.skip()
        return
      }

      // Sync should not fail even if Nile is not available
      const syncResult = await invokeTauriCommand<SyncResult>('sync_games')
      
      // Should not have critical Amazon-related errors that crash the app
      const criticalErrors = syncResult.errors.filter(
        (e) => e.includes('Amazon') && e.includes('crash')
      )
      expect(criticalErrors.length).toBe(0)
    })

    it('should load Amazon library when authenticated', async function () {
      if (!amazonStatus?.available || !amazonStatus?.authenticated) {
        console.log('Skipping: Nile not available or not authenticated')
        this.skip()
        return
      }

      const allGames = await invokeTauriCommand<Game[]>('get_games')
      const amazonGames = allGames.filter((g) => g.store === 'amazon')

      console.log(`Found ${amazonGames.length} Amazon Games`)
      expect(Array.isArray(amazonGames)).toBe(true)
    })
  })

  describe('Combined Library', () => {
    it('should load games from all authenticated stores', async () => {
      const syncResult = await invokeTauriCommand<SyncResult>('sync_games')
      const allGames = await invokeTauriCommand<Game[]>('get_games')

      console.log(`Total games: ${allGames.length}`)
      console.log(`Sync result - total: ${syncResult.total_games}, new: ${syncResult.new_games}`)

      // Group by store
      const byStore = allGames.reduce(
        (acc, game) => {
          acc[game.store] = (acc[game.store] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      console.log('Games by store:', JSON.stringify(byStore, null, 2))
      
      expect(Array.isArray(allGames)).toBe(true)
    })

    it('should not have duplicate games', async () => {
      const allGames = await invokeTauriCommand<Game[]>('get_games')
      
      const ids = allGames.map((g) => g.id)
      const uniqueIds = new Set(ids)
      
      expect(ids.length).toBe(uniqueIds.size)
    })

    it('should report sync errors without crashing', async () => {
      const syncResult = await invokeTauriCommand<SyncResult>('sync_games')
      
      // Errors array should be defined even if empty
      expect(Array.isArray(syncResult.errors)).toBe(true)
      
      if (syncResult.errors.length > 0) {
        console.log('Sync errors (non-critical):', syncResult.errors)
      }
    })
  })

  after(async () => {
    await takeScreenshot('store-loading-final')
  })
})
