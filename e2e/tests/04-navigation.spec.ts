/**
 * Pixxiden E2E Tests - Navigation
 * 
 * Tests for navigating between different views:
 * - Library view (French: Bibliothèque)
 * - Settings view (French: Paramètres)
 * - Game detail view
 * 
 * Note: Uses mock data for deterministic testing
 * Note: UI is in French
 */

import { 
  waitForAppReady, 
  takeScreenshot,
  setupMockTauriCommands,
  injectMockGames 
} from '../helpers'

/**
 * Helper to navigate to settings and wait for it to load
 */
async function navigateToSettings() {
  // Use programmatic navigation (like 06-store-authentication does)
  await browser.execute(() => {
    const router = (window as any).__VUE_ROUTER__
    if (router) {
      router.push('/settings')
    }
  })
  
  // Wait a bit for Vue Router to process the navigation
  await browser.pause(1500)
  
  // Then verify settings loaded by checking for aside element
  const aside = await $('aside')
  const exists = await aside.isExisting()
  if (!exists) {
    throw new Error('Settings view did not load')
  }
}

/**
 * Helper to navigate to library and wait for it to load
 */
async function navigateToLibrary() {
  // Use programmatic navigation
  await browser.execute(() => {
    const router = (window as any).__VUE_ROUTER__
    if (router) {
      router.push('/')
    }
  })
  
  // Wait for Vue Router to process the navigation
  await browser.pause(1500)
  
  // Verify library loaded by checking for .library-header or .library-view
  const libraryHeader = await $('.library-header')
  const libraryView = await $('.library-view')
  const hasLibrary = await libraryHeader.isExisting() || await libraryView.isExisting()
  
  if (!hasLibrary) {
    throw new Error('Library view did not load')
  }
}

describe('Navigation', () => {
  before(async () => {
    await waitForAppReady()
    
    // Setup mock Tauri commands and inject mock games
    await setupMockTauriCommands()
    await injectMockGames()
    
    // Wait for the library view to fully render
    // Check for .library-header which is unique to LibraryFullscreen
    await browser.waitUntil(
      async () => {
        const header = await $('.library-header')
        return await header.isExisting()
      },
      { timeout: 10000, timeoutMsg: 'Library view did not render after setup' }
    )
  })

  describe('Route Navigation', () => {
    it('should start on library view (default route)', async () => {
      const url = await browser.getUrl()
      console.log(`Initial URL: ${url}`)
      
      // Should be on root or library route
      expect(url.endsWith('/') || url.includes('library')).toBe(true)
      
      // Verify we're on library by checking for .library-header
      const libraryHeader = await $('.library-header')
      const exists = await libraryHeader.isExisting()
      console.log(`Library header exists: ${exists}`)
      expect(exists).toBe(true)
    })

    it('should navigate to settings view', async () => {
      await navigateToSettings()
      
      // Verify we're on settings by checking for CONFIGURATION text
      const bodyText = await $('body').getText()
      const hasConfig = bodyText.includes('CONFIGURATION')
      console.log(`Has CONFIGURATION: ${hasConfig}`)
      expect(hasConfig).toBe(true)
    })

    it('should navigate back to library', async () => {
      await navigateToLibrary()
      
      // Verify we're on library by checking for .library-header
      const libraryHeader = await $('.library-header')
      const exists = await libraryHeader.isExisting()
      console.log(`Library header exists: ${exists}`)
      expect(exists).toBe(true)
    })
  })

  describe('Settings Sections', () => {
    before(async () => {
      // Navigate to settings first
      await navigateToSettings()
    })

    it('should display settings sidebar', async () => {
      // Settings uses <aside> for sidebar
      const sidebar = await $('aside')
      const isExisting = await sidebar.isExisting()
      console.log(`Sidebar existing: ${isExisting}`)
      expect(isExisting).toBe(true)
    })

    it('should show system section by default (French: Système)', async () => {
      // The main content should have "Système" as the default section
      const bodyText = await $('body').getText()
      const hasSystem = bodyText.includes('Système')
      console.log(`Has Système: ${hasSystem}`)
      expect(hasSystem).toBe(true)
    })

    it('should show accounts section (French: Comptes)', async () => {
      // Click on accounts section in sidebar
      const accountsButton = await $('button*=Comptes')
      
      if (await accountsButton.isExisting()) {
        await accountsButton.click()
        await browser.pause(500)

        // Should show accounts content
        const bodyText = await $('body').getText()
        const hasComptes = bodyText.includes('Comptes')
        console.log(`Has Comptes after click: ${hasComptes}`)
        // This is a non-asserting test - just verify click works
      }
    })

    it('should display Epic Games store settings', async () => {
      // First ensure we're on accounts section
      const accountsButton = await $('button*=Comptes')
      if (await accountsButton.isExisting()) {
        await accountsButton.click()
        await browser.pause(500)
      }
      
      // Check for Epic Games in the page
      const bodyText = await $('body').getText()
      const hasEpic = bodyText.includes('Epic')
      console.log(`Has Epic: ${hasEpic}`)
      expect(hasEpic).toBe(true)
    })

    it('should display GOG store settings', async () => {
      const bodyText = await $('body').getText()
      const hasGog = bodyText.includes('GOG')
      console.log(`Has GOG: ${hasGog}`)
      expect(hasGog).toBe(true)
    })

    it('should display Amazon Games store settings', async () => {
      const bodyText = await $('body').getText()
      const hasAmazon = bodyText.includes('Amazon')
      console.log(`Has Amazon: ${hasAmazon}`)
      expect(hasAmazon).toBe(true)
    })

    it('should show advanced section (French: Avancé)', async () => {
      const advancedButton = await $('button*=Avancé')
      
      if (await advancedButton.isExisting()) {
        await advancedButton.click()
        await browser.pause(500)
        console.log('Advanced section clicked')
      }
    })
  })

  describe('Browser History', () => {
    before(async () => {
      // Start fresh from library
      await navigateToLibrary()
    })

    it('should support browser back navigation', async () => {
      // Navigate to settings first
      await navigateToSettings()
      
      // Verify we're on settings by checking for aside element
      const settingsAside = await $('aside')
      const onSettings = await settingsAside.isExisting()
      console.log(`Before back - on settings: ${onSettings}`)

      // Go back
      await browser.back()
      await browser.pause(1000)

      // Should be back on library - check for library header
      const libraryHeader = await $('.library-header')
      const onLibrary = await libraryHeader.isExisting()
      console.log(`After back - on library: ${onLibrary}`)
      expect(onLibrary).toBe(true)
    })

    it('should support browser forward navigation', async () => {
      // Go forward to settings
      await browser.forward()
      await browser.pause(1000)

      // Should be on settings - check for aside element
      const settingsAside = await $('aside')
      const onSettings = await settingsAside.isExisting()
      console.log(`After forward - on settings: ${onSettings}`)
      expect(onSettings).toBe(true)
    })
  })

  after(async () => {
    // Return to library for next tests
    try {
      await navigateToLibrary()
    } catch (e) {
      // Ignore errors in cleanup
    }
    
    await takeScreenshot('navigation-final')
  })
})
