/**
 * Pixxiden E2E Tests - Application Launch
 * 
 * Tests that the application launches correctly and basic UI is functional.
 * Note: The splash screen may or may not be visible when tests start, depending on timing.
 */

import { waitForAppReady, takeScreenshot } from '../helpers'
import { Selectors } from '../helpers/selectors'

describe('Application Launch', () => {
  before(async () => {
    // Wait for app to be fully loaded (splash screen should be closed)
    await waitForAppReady()
  })

  it('should launch the application successfully', async () => {
    const app = await $(Selectors.app)
    expect(await app.isExisting()).toBe(true)
  })

  it('should display the main app container', async () => {
    const app = await $(Selectors.app)
    expect(await app.isDisplayed()).toBe(true)
  })

  it('should not show splash screen in main window', async () => {
    // Verify splash screen is not present in the main window
    const splashContainer = await $('.splash-container')
    expect(await splashContainer.isExisting()).toBe(false)
  })

  it('should render the library view as default route', async () => {
    // The app should start on the library view
    // BottomFilters uses English labels: "all games", "installed", etc.
    // First make sure we're on the main window
    const handles = await browser.getWindowHandles()
    for (const handle of handles) {
      await browser.switchToWindow(handle)
      const url = await browser.getUrl()
      // Main window has no ?splash parameter
      if (!url.includes('?splash')) {
        break
      }
    }
    
    await browser.waitUntil(
      async () => {
        const bodyText = await $('body').getText()
        // Check for filter buttons that are visible in BottomFilters
        return bodyText.includes('all games') || bodyText.includes('installed')
      },
      { timeout: 15000, timeoutMsg: 'Library view not displayed' }
    )
  })

  it('should display the header with navigation elements', async () => {
    // Make sure we're on the main window
    const handles = await browser.getWindowHandles()
    for (const handle of handles) {
      try {
        await browser.switchToWindow(handle)
        const url = await browser.getUrl()
        // Main window has no ?splash parameter
        if (!url.includes('?splash')) {
          break
        }
      } catch (e) {
        // Window might be closed, continue
      }
    }
    
    // Check for filter buttons (English labels from BottomFilters component)
    const bodyText = await $('body').getText()
    const hasFilters = bodyText.includes('all games') || bodyText.includes('installed')
    expect(hasFilters).toBe(true)
  })

  after(async () => {
    // Take screenshot for debugging if needed
    await takeScreenshot('app-launch-final')
  })
})
