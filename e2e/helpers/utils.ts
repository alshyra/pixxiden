/**
 * PixiDen E2E Test Utilities
 * 
 * Helper functions for interacting with the Tauri app via WebDriver.
 * Uses real store binaries (legendary, gogdl, nile) for integration testing.
 */

/**
 * Wait for element to be displayed and return it
 */
export async function waitForElement(selector: string, timeout = 10000): Promise<WebdriverIO.Element> {
  const element = await $(selector)
  await element.waitForDisplayed({ timeout })
  return element
}

/**
 * Wait for element and click it
 */
export async function clickElement(selector: string, timeout = 10000): Promise<void> {
  const element = await waitForElement(selector, timeout)
  await element.click()
}

/**
 * Wait for element and get its text
 */
export async function getElementText(selector: string, timeout = 10000): Promise<string> {
  const element = await waitForElement(selector, timeout)
  return element.getText()
}

/**
 * Check if element exists and is displayed
 */
export async function isElementDisplayed(selector: string, timeout = 5000): Promise<boolean> {
  try {
    const element = await $(selector)
    await element.waitForDisplayed({ timeout })
    return true
  } catch {
    return false
  }
}

/**
 * Wait for multiple elements
 */
export async function waitForElements(selector: string, timeout = 10000): Promise<WebdriverIO.ElementArray> {
  await browser.waitUntil(
    async () => {
      const elements = await $$(selector)
      return elements.length > 0
    },
    { timeout, timeoutMsg: `Elements ${selector} not found` }
  )
  return $$(selector)
}

/**
 * Count elements matching selector
 */
export async function countElements(selector: string): Promise<number> {
  const elements = await $$(selector)
  return elements.length
}

/**
 * Navigate to a route in the app
 */
export async function navigateTo(route: string): Promise<void> {
  // Execute navigation via JavaScript in the app context
  await browser.execute((path: string) => {
    (window as any).__VUE_ROUTER__?.push(path)
  }, route)
  // Wait for navigation to complete
  await browser.pause(500)
}

/**
 * Wait for app to be fully loaded
 */
export async function waitForAppReady(timeout = 30000): Promise<void> {
  // Wait for the main app container to be present
  await browser.waitUntil(
    async () => {
      const app = await $('#app')
      return app.isDisplayed()
    },
    { timeout, timeoutMsg: 'App did not load in time' }
  )
  // Additional wait for Vue to initialize
  await browser.pause(1000)
}

/**
 * Get all visible game cards
 */
export async function getGameCards(): Promise<WebdriverIO.ElementArray> {
  return $$('[data-testid="game-card"]')
}

/**
 * Get game card by title
 */
export async function getGameCardByTitle(title: string): Promise<WebdriverIO.Element | null> {
  const cards = await getGameCards()
  for (const card of cards) {
    const cardTitle = await card.$('[data-testid="game-title"]')
    if (await cardTitle.isExisting()) {
      const text = await cardTitle.getText()
      if (text.includes(title)) {
        return card
      }
    }
  }
  return null
}

/**
 * Trigger library sync and wait for completion
 */
export async function syncLibrary(timeout = 60000): Promise<void> {
  const syncButton = await $('[data-testid="sync-button"]')
  await syncButton.click()
  
  // Wait for sync to complete (button should stop spinning)
  await browser.waitUntil(
    async () => {
      const isSpinning = await syncButton.getAttribute('class')
      return !isSpinning?.includes('syncing')
    },
    { timeout, timeoutMsg: 'Library sync did not complete in time' }
  )
}

/**
 * Filter games by store
 */
export async function filterByStore(store: 'all' | 'epic' | 'gog' | 'amazon'): Promise<void> {
  const filterButton = await $(`[data-testid="store-filter-${store}"]`)
  await filterButton.click()
  await browser.pause(300) // Wait for filter animation
}

/**
 * Sort games by criteria
 */
export async function sortGamesBy(criteria: 'title' | 'playtime' | 'recent'): Promise<void> {
  const sortSelect = await $('[data-testid="sort-select"]')
  await sortSelect.selectByAttribute('value', criteria)
  await browser.pause(300)
}

/**
 * Get store connection status from settings
 */
export async function getStoreStatus(store: 'legendary' | 'gogdl' | 'nile'): Promise<{
  available: boolean
  authenticated: boolean
}> {
  const statusElement = await $(`[data-testid="store-status-${store}"]`)
  const isConnected = await statusElement.$('.connected')
  const isAvailable = await statusElement.$('.available')
  
  return {
    available: await isAvailable.isExisting(),
    authenticated: await isConnected.isExisting(),
  }
}

/**
 * Take a screenshot for debugging
 */
export async function takeScreenshot(name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await browser.saveScreenshot(`./e2e/screenshots/${name}-${timestamp}.png`)
}

/**
 * Execute Tauri command via IPC
 */
export async function invokeTauriCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return browser.execute(
    async (cmd: string, cmdArgs: Record<string, unknown> | undefined) => {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke(cmd, cmdArgs)
    },
    command,
    args
  ) as Promise<T>
}

/**
 * Check if a CLI binary is available
 */
export async function isBinaryAvailable(binary: 'legendary' | 'gogdl' | 'nile'): Promise<boolean> {
  const status = await invokeTauriCommand<Array<{ name: string; available: boolean }>>('get_store_status')
  const store = status.find((s) => s.name === binary || 
    (binary === 'legendary' && s.name === 'epic') ||
    (binary === 'gogdl' && s.name === 'gog'))
  return store?.available ?? false
}
