/**
 * Enable mock mode for E2E tests
 * 
 * This helper activates the mock mode in the application by setting
 * localStorage before the app initializes, ensuring that all API calls
 * return mock data instead of making real backend requests.
 */

export async function enableMockMode() {
  try {
    // Execute script in browser context to enable mock mode
    await browser.execute(() => {
      // Set localStorage flag
      localStorage.setItem('PIXXIDEN_MOCK_MODE', 'true')
      console.log('🎭 [E2E] Mock mode enabled via localStorage')
    })
  } catch (error) {
    console.error('Failed to enable mock mode:', error)
  }
}

/**
 * Disable mock mode (for cleanup)
 */
export async function disableMockMode() {
  try {
    await browser.execute(() => {
      localStorage.removeItem('PIXXIDEN_MOCK_MODE')
      console.log('🎭 [E2E] Mock mode disabled')
    })
  } catch (error) {
    console.error('Failed to disable mock mode:', error)
  }
}
