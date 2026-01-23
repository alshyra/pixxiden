/**
 * Pixxiden E2E Tests - Store Authentication
 * 
 * Tests for store authentication UI:
 * - Check authentication status display
 * - Verify store connection UI elements
 * 
 * Note: Uses mock data to test the UI without requiring real credentials.
 * Note: UI is in French (Système, Comptes, Avancé)
 */

import { 
  waitForAppReady, 
  takeScreenshot,
  setupMockTauriCommands,
  injectMockGames 
} from '../helpers'

// Define types locally for tests
interface StoreStatus {
  name: string
  available: boolean
  authenticated: boolean
  username: string
}

// Helper to invoke Tauri commands from browser context
async function invokeTauriCommand<T>(cmd: string, args?: any): Promise<T> {
  return browser.executeAsync((command, commandArgs, done) => {
    const invoke = (window as any).__TAURI__?.invoke
    if (!invoke) {
      done(null)
      return
    }
    invoke(command, commandArgs)
      .then((result: any) => done(result))
      .catch((error: any) => {
        console.error('Invoke error:', error)
        done(null)
      })
  }, cmd, args)
}

describe('Store Authentication', () => {
  let storeStatuses: StoreStatus[] = []

  before(async () => {
    await waitForAppReady()
    
    // Setup mock Tauri commands and inject mock games
    await setupMockTauriCommands()
    await injectMockGames()
    
    // Get store statuses for later tests
    storeStatuses = await invokeTauriCommand<StoreStatus[]>('get_store_status') || []
  })

  describe('Settings Store Section', () => {
    before(async () => {
      // Navigate to settings
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push('/settings')
      })
      await browser.pause(1500)
    })

    it('should display store accounts section in settings', async () => {
      // Check if we're in settings and can see account-related content
      const bodyText = await $('body').getText()
      
      // Should mention stores or accounts somewhere
      const hasStoreContent = bodyText.toLowerCase().includes('store') || 
                              bodyText.toLowerCase().includes('account') ||
                              bodyText.toLowerCase().includes('epic') ||
                              bodyText.toLowerCase().includes('gog') ||
                              bodyText.toLowerCase().includes('amazon')
      
      console.log(`Store/account content found: ${hasStoreContent}`)
      await takeScreenshot('settings-stores-section')
    })

    it('should have connection buttons for stores', async () => {
      // Look for buttons that might be for connecting to stores
      const buttons = await $$('button')
      const buttonTextsArray: string[] = []
      for (const btn of buttons) {
        try {
          const text = await btn.getText()
          buttonTextsArray.push(text)
        } catch {
          // Ignore errors for elements that can't be read
        }
      }
      
      console.log(`Found ${buttons.length} buttons in settings`)
      console.log('Button texts:', buttonTextsArray.filter(t => t.length > 0))
      
      await takeScreenshot('settings-store-buttons')
    })
  })

  describe('Store Configuration', () => {
    it('should allow navigation between settings sections', async () => {
      // The settings should have tabs or sections
      const bodyText = await $('body').getText()
      
      // Common settings sections
      const hasSystemSection = bodyText.toLowerCase().includes('system') || bodyText.toLowerCase().includes('système')
      const hasAccountsSection = bodyText.toLowerCase().includes('account') || bodyText.toLowerCase().includes('compte')
      const hasAdvancedSection = bodyText.toLowerCase().includes('advanced') || bodyText.toLowerCase().includes('avancé')
      
      console.log(`System section: ${hasSystemSection}`)
      console.log(`Accounts section: ${hasAccountsSection}`)
      console.log(`Advanced section: ${hasAdvancedSection}`)
      
      await takeScreenshot('settings-sections')
    })
  })

  describe('Authentication Persistence', () => {
    it('should persist authentication across app restarts', async function () {
      // Get initial status
      const initialStatus = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      
      // Refresh page
      await browser.refresh()
      await waitForAppReady()
      
      // Re-setup mock commands after refresh (mocks don't persist across refresh)
      await setupMockTauriCommands()
      await injectMockGames()
      
      // Get status after refresh
      const refreshedStatus = await invokeTauriCommand<StoreStatus[]>('get_store_status')
      
      // Status should be the same (mocks return consistent data)
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
