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

  it('should have window title set correctly', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('Pixxiden')
  })

  it('should render the library view as default route', async () => {
    // The app should start on the library view (French UI)
    await browser.waitUntil(
      async () => {
        // Check for library-related content (French: "Bibliothèque" or "Ma Collection")
        const bodyText = await $('body').getText()
        const hasLibrary = bodyText.includes('Bibliothèque') || 
                          bodyText.includes('Ma Collection') ||
                          bodyText.includes('bibliothèque')
        return hasLibrary
      },
      { timeout: 10000, timeoutMsg: 'Library view not displayed' }
    )
  })

  it('should display the header with navigation elements', async () => {
    // Check for filter buttons (French labels)
    const bodyText = await $('body').getText()
    const hasFilters = bodyText.includes('Tous') || bodyText.includes('Installés')
    expect(hasFilters).toBe(true)
  })

  after(async () => {
    // Take screenshot for debugging if needed
    await takeScreenshot('app-launch-final')
  })
})
