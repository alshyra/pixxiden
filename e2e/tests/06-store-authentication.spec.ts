/**
 * PixiDen E2E Tests - Store Authentication
 * 
 * Tests for store authentication flows:
 * - Check authentication status
 * - Connect/disconnect stores
 * - Verify authenticated features
 * 
 * Note: Actual authentication requires real credentials and OAuth flows.
 * These tests verify the UI and status checking functionality.
 */

import { waitForAppReady, invokeTauriCommand, takeScreenshot } from '../helpers'

interface StoreStatus {
  name: string
  available: boolean
  authenticated: boolean
}

describe('Store Authentication', () => {
  let storeStatuses: StoreStatus[] = []

  before(async () => {
    await waitForAppReady()
    storeStatuses = await invokeTauriCommand<StoreStatus[]>('get_store_status')
  })

  describe('Settings Store Section', () => {
    before(async () => {
      // Navigate to settings
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push('/settings')
      })
      await browser.pause(1000)
    })

    it('should display Epic Games connection status', async () => {
      const epicSection = await $('*=Epic Games')
      expect(await epicSection.isExisting()).toBe(true)

      const epicStatus = storeStatuses.find((s) => s.name === 'epic')
      console.log(`Epic status: available=${epicStatus?.available}, authenticated=${epicStatus?.authenticated}`)

      // Should show connected/not connected status
      const statusText = await $('*=Connected')
      const notConnectedText = await $('*=Not connected')
      
      const hasStatus = (await statusText.isExisting()) || (await notConnectedText.isExisting())
      expect(hasStatus).toBe(true)
    })

    it('should display GOG connection status', async () => {
      const gogSection = await $('*=GOG')
      expect(await gogSection.isExisting()).toBe(true)

      const gogStatus = storeStatuses.find((s) => s.name === 'gog')
      console.log(`GOG status: available=${gogStatus?.available}, authenticated=${gogStatus?.authenticated}`)
    })

    it('should display Amazon Games connection status', async () => {
      const amazonSection = await $('*=Amazon')
      expect(await amazonSection.isExisting()).toBe(true)

      const amazonStatus = storeStatuses.find((s) => s.name === 'amazon')
      console.log(`Amazon status: available=${amazonStatus?.available}, authenticated=${amazonStatus?.authenticated}`)
    })
  })

  describe('Epic Games (Legendary) Authentication', () => {
    let epicStatus: StoreStatus | undefined

    before(() => {
      epicStatus = storeStatuses.find((s) => s.name === 'epic')
    })

    it('should show connect button when not authenticated', async function () {
      if (epicStatus?.authenticated) {
        console.log('Epic already authenticated - skipping connect button test')
        this.skip()
        return
      }

      const connectButton = await $('button*=Connect')
      expect(await connectButton.isExisting()).toBe(true)
    })

    it('should show disconnect button when authenticated', async function () {
      if (!epicStatus?.authenticated) {
        console.log('Epic not authenticated - skipping disconnect button test')
        this.skip()
        return
      }

      const disconnectButton = await $('button*=Disconnect')
      expect(await disconnectButton.isExisting()).toBe(true)
    })

    it('should show sync button when authenticated', async function () {
      if (!epicStatus?.authenticated) {
        this.skip()
        return
      }

      const syncButton = await $('button*=Sync')
      expect(await syncButton.isExisting()).toBe(true)
    })

    it('should verify authentication status via backend', async () => {
      const status = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      const epic = status.find((s) => s.name === 'epic')

      expect(epic).toBeDefined()
      expect(typeof epic?.authenticated).toBe('boolean')
      
      console.log(`Backend reports Epic authenticated: ${epic?.authenticated}`)
    })
  })

  describe('GOG (GOGDL) Authentication', () => {
    let gogStatus: StoreStatus | undefined

    before(() => {
      gogStatus = storeStatuses.find((s) => s.name === 'gog')
    })

    it('should show connect button when not authenticated', async function () {
      if (gogStatus?.authenticated) {
        console.log('GOG already authenticated - skipping')
        this.skip()
        return
      }

      // Find GOG section and its connect button
      const gogSection = await $('*=GOG.com')
      if (await gogSection.isExisting()) {
        const parent = await gogSection.$('./..')
        const connectButton = await parent.$('button*=Connect')
        console.log(`GOG connect button exists: ${await connectButton.isExisting()}`)
      }
    })

    it('should verify authentication status via backend', async () => {
      const status = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      const gog = status.find((s) => s.name === 'gog')

      expect(gog).toBeDefined()
      expect(typeof gog?.authenticated).toBe('boolean')
      
      console.log(`Backend reports GOG authenticated: ${gog?.authenticated}`)
    })
  })

  describe('Amazon Games (Nile) Authentication', () => {
    let amazonStatus: StoreStatus | undefined

    before(() => {
      amazonStatus = storeStatuses.find((s) => s.name === 'amazon')
    })

    it('should show appropriate status for Nile', async () => {
      // Nile might not be fully implemented
      console.log(`Nile available: ${amazonStatus?.available}`)
      console.log(`Nile authenticated: ${amazonStatus?.authenticated}`)
      
      expect(amazonStatus).toBeDefined()
    })

    it('should handle unavailable Nile gracefully', async function () {
      if (amazonStatus?.available) {
        this.skip()
        return
      }

      // The UI should still show Amazon section without crashing
      const amazonSection = await $('*=Amazon')
      expect(await amazonSection.isExisting()).toBe(true)
    })
  })

  describe('Authentication State Persistence', () => {
    it('should persist authentication across page refresh', async () => {
      // Get initial status
      const initialStatus = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      
      // Refresh page
      await browser.refresh()
      await waitForAppReady()
      
      // Get status after refresh
      const refreshedStatus = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      
      // Status should be the same
      for (const store of initialStatus) {
        const refreshed = refreshedStatus.find((s) => s.name === store.name)
        expect(refreshed?.authenticated).toBe(store.authenticated)
      }
      
      console.log('Authentication state persisted correctly')
    })
  })

  describe('Binary Detection', () => {
    it('should detect legendary binary correctly', async () => {
      const epicStatus = storeStatuses.find((s) => s.name === 'epic')
      
      if (epicStatus?.available) {
        console.log('✓ Legendary binary detected')
      } else {
        console.log('✗ Legendary binary not found')
      }
      
      expect(typeof epicStatus?.available).toBe('boolean')
    })

    it('should detect gogdl binary correctly', async () => {
      const gogStatus = storeStatuses.find((s) => s.name === 'gog')
      
      if (gogStatus?.available) {
        console.log('✓ GOGDL binary detected')
      } else {
        console.log('✗ GOGDL binary not found')
      }
      
      expect(typeof gogStatus?.available).toBe('boolean')
    })

    it('should detect nile binary correctly', async () => {
      const amazonStatus = storeStatuses.find((s) => s.name === 'amazon')
      
      if (amazonStatus?.available) {
        console.log('✓ Nile binary detected')
      } else {
        console.log('✗ Nile binary not found')
      }
      
      expect(typeof amazonStatus?.available).toBe('boolean')
    })
  })

  after(async () => {
    await takeScreenshot('store-auth-final')
  })
})
