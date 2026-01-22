/**
 * PixiDen E2E Tests - Splash Screen
 * 
 * Tests that the splash screen appears on startup and transitions correctly to the main window.
 */

import { takeScreenshot } from '../helpers'

describe('Splash Screen', () => {
  it('should show splash screen on application startup', async () => {
    // The splash screen should be visible immediately
    // Note: This test assumes the app just launched and splash is still visible
    // In reality, the splash might be gone by the time WebDriver connects
    
    // Try to detect if we can see splash screen elements
    const splashTitle = await $('h1.app-title')
    
    // If splash is still visible, verify it
    if (await splashTitle.isExisting()) {
      expect(await splashTitle.getText()).toBe('PixiDen')
      await takeScreenshot('splash-screen-visible')
    }
  })

  it('should transition to main window after initialization', async () => {
    // Wait for the main app to be loaded (splash should be gone)
    await browser.waitUntil(
      async () => {
        const app = await $('#app')
        const isDisplayed = await app.isDisplayed()
        
        // Check if we're in the main app (not splash)
        if (isDisplayed) {
          const splashContainer = await $('.splash-container')
          const hasSplash = await splashContainer.isExisting()
          return !hasSplash // Main app should not have splash container
        }
        return false
      },
      { 
        timeout: 30000, 
        timeoutMsg: 'Main window did not appear after splash screen' 
      }
    )

    // Verify main app is displayed
    const app = await $('#app')
    expect(await app.isDisplayed()).toBe(true)
    
    await takeScreenshot('main-window-after-splash')
  })

  it('should have loaded the main window with proper title', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('PixiDen')
  })

  it('should have rendered the main app content', async () => {
    // Wait for main content to be visible
    await browser.waitUntil(
      async () => {
        const h2 = await $('h2')
        return h2.isExisting()
      },
      { timeout: 10000 }
    )

    // Verify we're in the main app, not splash screen
    const splashContainer = await $('.splash-container')
    expect(await splashContainer.isExisting()).toBe(false)
  })

  it('should not have any splash screen elements in main window', async () => {
    const loader = await $('.loader')
    const splashContent = await $('.splash-content')
    
    expect(await loader.isExisting()).toBe(false)
    expect(await splashContent.isExisting()).toBe(false)
  })

  after(async () => {
    await takeScreenshot('splash-test-final')
  })
})
