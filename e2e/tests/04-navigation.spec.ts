/**
 * PixiDen E2E Tests - Navigation
 * 
 * Tests for navigating between different views:
 * - Library view
 * - Downloads view
 * - Settings view
 * - Game detail view
 */

import { waitForAppReady, takeScreenshot } from '../helpers'

describe('Navigation', () => {
  before(async () => {
    await waitForAppReady()
  })

  describe('Route Navigation', () => {
    it('should start on library view (default route)', async () => {
      const url = await browser.getUrl()
      console.log(`Initial URL: ${url}`)
      
      // Should be on root or library route
      expect(url.endsWith('/') || url.includes('library')).toBe(true)
    })

    it('should navigate to settings view', async () => {
      // Look for settings navigation link
      const settingsLink = await $('a[href*="settings"]')
      
      if (await settingsLink.isExisting()) {
        await settingsLink.click()
      } else {
        // Try programmatic navigation
        await browser.execute(() => {
          (window as any).__VUE_ROUTER__?.push('/settings')
        })
      }

      await browser.pause(1000)

      // Verify we're on settings page
      const heading = await $('h1')
      await heading.waitForDisplayed({ timeout: 5000 })
      
      const text = await heading.getText()
      expect(text.toLowerCase()).toContain('settings')
    })

    it('should navigate to downloads view', async () => {
      const downloadsLink = await $('a[href*="downloads"]')
      
      if (await downloadsLink.isExisting()) {
        await downloadsLink.click()
      } else {
        await browser.execute(() => {
          (window as any).__VUE_ROUTER__?.push('/downloads')
        })
      }

      await browser.pause(1000)

      // Verify we're on downloads page
      const heading = await $('h1, h2')
      await heading.waitForDisplayed({ timeout: 5000 })
      
      const text = await heading.getText()
      // Should show downloads or download queue related content
      expect(text.toLowerCase()).toMatch(/download|queue/)
    })

    it('should navigate back to library', async () => {
      const libraryLink = await $('a[href="/"]')
      
      if (await libraryLink.isExisting()) {
        await libraryLink.click()
      } else {
        await browser.execute(() => {
          (window as any).__VUE_ROUTER__?.push('/')
        })
      }

      await browser.pause(1000)

      // Verify we're on library page
      const heading = await $('h2')
      await heading.waitForDisplayed({ timeout: 5000 })
      
      const text = await heading.getText()
      expect(text.toLowerCase()).toContain('library')
    })
  })

  describe('Settings Sections', () => {
    before(async () => {
      // Navigate to settings
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push('/settings')
      })
      await browser.pause(1000)
    })

    it('should display settings sidebar', async () => {
      const sidebar = await $('nav')
      expect(await sidebar.isDisplayed()).toBe(true)
    })

    it('should show stores section', async () => {
      // Click on stores section in sidebar
      const storesButton = await $('button*=Store')
      
      if (await storesButton.isExisting()) {
        await storesButton.click()
        await browser.pause(300)

        // Should show store accounts section
        const storeSection = await $('*=Store Accounts')
        expect(await storeSection.isDisplayed()).toBe(true)
      }
    })

    it('should display Epic Games store settings', async () => {
      const epicSection = await $('*=Epic Games')
      expect(await epicSection.isExisting()).toBe(true)
    })

    it('should display GOG store settings', async () => {
      const gogSection = await $('*=GOG')
      expect(await gogSection.isExisting()).toBe(true)
    })

    it('should display Amazon Games store settings', async () => {
      const amazonSection = await $('*=Amazon')
      expect(await amazonSection.isExisting()).toBe(true)
    })
  })

  describe('Browser History', () => {
    before(async () => {
      // Start fresh from library
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push('/')
      })
      await browser.pause(500)
    })

    it('should support browser back navigation', async () => {
      // Navigate to settings
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push('/settings')
      })
      await browser.pause(500)

      // Go back
      await browser.back()
      await browser.pause(500)

      // Should be back on library
      const heading = await $('h2')
      const text = await heading.getText()
      expect(text.toLowerCase()).toContain('library')
    })

    it('should support browser forward navigation', async () => {
      // Go forward to settings
      await browser.forward()
      await browser.pause(500)

      // Should be on settings
      const heading = await $('h1')
      const text = await heading.getText()
      expect(text.toLowerCase()).toContain('settings')
    })
  })

  after(async () => {
    await takeScreenshot('navigation-final')
  })
})
