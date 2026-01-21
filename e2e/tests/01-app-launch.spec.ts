/**
 * PixiDen E2E Tests - Application Launch
 * 
 * Tests that the application launches correctly and basic UI is functional.
 */

import { waitForAppReady, takeScreenshot } from '../helpers'
import { Selectors } from '../helpers/selectors'

describe('Application Launch', () => {
  before(async () => {
    // Wait for app to be fully loaded
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

  it('should have window title set correctly', async () => {
    const title = await browser.getTitle()
    expect(title).toContain('PixiDen')
  })

  it('should render the library view as default route', async () => {
    // The app should start on the library view
    await browser.waitUntil(
      async () => {
        // Check for library-related content
        const libraryContent = await $('h2')
        if (await libraryContent.isExisting()) {
          const text = await libraryContent.getText()
          return text.includes('Library') || text.includes('library')
        }
        return false
      },
      { timeout: 10000, timeoutMsg: 'Library view not displayed' }
    )
  })

  it('should not show any critical errors in console', async () => {
    const logs = await browser.getLogs('browser')
    const criticalErrors = logs.filter(
      (log: any) => log.level === 'SEVERE' && !log.message.includes('favicon')
    )
    expect(criticalErrors.length).toBe(0)
  })

  after(async () => {
    // Take screenshot for debugging if needed
    await takeScreenshot('app-launch-final')
  })
})
