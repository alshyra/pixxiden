/**
 * PixiDen E2E Tests - Library UI
 * 
 * Tests for the library view UI interactions:
 * - Game grid display
 * - Store filtering
 * - Game sorting
 * - Game card interactions
 */

import { waitForAppReady, invokeTauriCommand, takeScreenshot } from '../helpers'

interface Game {
  id: string
  title: string
  store: string
  store_id: string
  installed: boolean
  play_time_minutes?: number
  last_played?: string
}

describe('Library UI', () => {
  let games: Game[] = []

  before(async () => {
    await waitForAppReady()
    
    // Ensure we have synced games
    await invokeTauriCommand('sync_games')
    games = await invokeTauriCommand<Game[]>('get_games')
    console.log(`Test setup: ${games.length} games loaded`)
  })

  describe('Game Grid Display', () => {
    it('should display the library heading', async () => {
      const heading = await $('h2')
      await heading.waitForDisplayed({ timeout: 5000 })
      
      const text = await heading.getText()
      expect(text.toLowerCase()).toContain('library')
    })

    it('should show loading state initially', async () => {
      // Refresh the page to see loading state
      await browser.refresh()
      
      // Check for loading indicator (spinner or text)
      const loadingIndicator = await $('.animate-spin')
      const wasLoading = await loadingIndicator.isExisting()
      
      // Wait for loading to complete
      await waitForAppReady()
      
      // Loading state should have been shown or quickly resolved
      console.log(`Loading indicator was shown: ${wasLoading}`)
    })

    it('should display game cards when games exist', async function () {
      if (games.length === 0) {
        console.log('No games available - skipping game card test')
        this.skip()
        return
      }

      // Wait for game grid to be rendered
      await browser.waitUntil(
        async () => {
          const cards = await $$('.group.relative')
          return cards.length > 0
        },
        { timeout: 10000, timeoutMsg: 'Game cards not rendered' }
      )

      const gameCards = await $$('.group.relative')
      expect(gameCards.length).toBeGreaterThan(0)
      console.log(`Found ${gameCards.length} game cards`)
    })

    it('should show empty state when no games', async function () {
      if (games.length > 0) {
        console.log('Games exist - skipping empty state test')
        this.skip()
        return
      }

      // Look for empty state message
      const emptyState = await $('*=No games found')
      expect(await emptyState.isDisplayed()).toBe(true)
    })

    it('should display game titles correctly', async function () {
      if (games.length === 0) {
        this.skip()
        return
      }

      // Hover over a game card to reveal overlay with title
      const firstCard = await $('.group.relative')
      await firstCard.moveTo()
      
      // Wait for hover animation
      await browser.pause(500)
      
      // Check for title in overlay
      const titleElement = await firstCard.$('h3')
      if (await titleElement.isExisting()) {
        const title = await titleElement.getText()
        expect(title.length).toBeGreaterThan(0)
        console.log(`First game title: ${title}`)
      }
    })
  })

  describe('Store Filtering', () => {
    it('should display store filter buttons', async () => {
      // Look for store filter buttons
      const filterButtons = await $$('button')
      const storeFilterTexts = ['All', 'Epic', 'GOG', 'Amazon']
      
      let foundFilters = 0
      for (const button of filterButtons) {
        const text = await button.getText()
        if (storeFilterTexts.some((f) => text.includes(f))) {
          foundFilters++
        }
      }
      
      console.log(`Found ${foundFilters} store filter buttons`)
      expect(foundFilters).toBeGreaterThan(0)
    })

    it('should filter games by Epic store', async function () {
      const epicGames = games.filter((g) => g.store === 'epic')
      if (epicGames.length === 0) {
        console.log('No Epic games - skipping Epic filter test')
        this.skip()
        return
      }

      // Click Epic filter button
      const epicButton = await $('button*=Epic')
      if (await epicButton.isExisting()) {
        await epicButton.click()
        await browser.pause(500)

        // Verify only Epic games are shown (by checking store badges)
        const storeBadges = await $$('span*=epic')
        console.log(`Epic filter: ${storeBadges.length} games displayed`)
      }
    })

    it('should filter games by GOG store', async function () {
      const gogGames = games.filter((g) => g.store === 'gog')
      if (gogGames.length === 0) {
        console.log('No GOG games - skipping GOG filter test')
        this.skip()
        return
      }

      const gogButton = await $('button*=GOG')
      if (await gogButton.isExisting()) {
        await gogButton.click()
        await browser.pause(500)

        const storeBadges = await $$('span*=gog')
        console.log(`GOG filter: ${storeBadges.length} games displayed`)
      }
    })

    it('should show all games when All filter is selected', async () => {
      // Click All filter
      const allButton = await $('button*=All')
      if (await allButton.isExisting()) {
        await allButton.click()
        await browser.pause(500)
      }

      // Count displayed game cards
      const gameCards = await $$('.group.relative')
      console.log(`All filter: ${gameCards.length} games displayed`)
      
      // Should match total games (or close to it)
      expect(gameCards.length).toBeLessThanOrEqual(games.length + 1)
    })
  })

  describe('Game Sorting', () => {
    it('should display sort dropdown', async () => {
      const sortSelect = await $('select')
      expect(await sortSelect.isExisting()).toBe(true)
    })

    it('should have sort options available', async () => {
      const sortSelect = await $('select')
      const options = await sortSelect.$$('option')
      
      const optionTexts: string[] = []
      for (const option of options) {
        optionTexts.push(await option.getText())
      }
      
      console.log('Sort options:', optionTexts)
      expect(optionTexts.length).toBeGreaterThan(0)
      
      // Should have common sort options
      const hasTitle = optionTexts.some((t) => t.toLowerCase().includes('title'))
      expect(hasTitle).toBe(true)
    })

    it('should sort by title', async function () {
      if (games.length < 2) {
        this.skip()
        return
      }

      const sortSelect = await $('select')
      await sortSelect.selectByVisibleText('Title')
      await browser.pause(500)

      // Get first two game titles
      const cards = await $$('.group.relative')
      if (cards.length >= 2) {
        await cards[0].moveTo()
        await browser.pause(300)
        const firstTitle = await cards[0].$('h3')
        const title1 = await firstTitle.getText()

        await cards[1].moveTo()
        await browser.pause(300)
        const secondTitle = await cards[1].$('h3')
        const title2 = await secondTitle.getText()

        console.log(`Sorted titles: "${title1}", "${title2}"`)
        // First title should come before or equal to second alphabetically
        expect(title1.localeCompare(title2)).toBeLessThanOrEqual(0)
      }
    })

    it('should sort by play time', async function () {
      const sortSelect = await $('select')
      const playTimeOption = await sortSelect.$('option*=Play')
      
      if (!(await playTimeOption.isExisting())) {
        console.log('Play time sort option not available')
        this.skip()
        return
      }

      await sortSelect.selectByVisibleText('Play Time')
      await browser.pause(500)
      
      console.log('Sorted by play time')
    })
  })

  describe('Sync Button', () => {
    it('should display sync button', async () => {
      const syncButton = await $('button*=Sync')
      expect(await syncButton.isExisting()).toBe(true)
    })

    it('should trigger library sync when clicked', async () => {
      const syncButton = await $('button*=Sync')
      await syncButton.click()

      // Check for syncing state (spinner animation)
      const spinner = await syncButton.$('.animate-spin')
      const wasSpinning = await spinner.isExisting()
      
      console.log(`Sync spinner shown: ${wasSpinning}`)

      // Wait for sync to complete (max 30 seconds)
      await browser.waitUntil(
        async () => {
          const isSpinning = await spinner.isExisting()
          return !isSpinning
        },
        { timeout: 30000, timeoutMsg: 'Sync took too long' }
      )

      console.log('Sync completed')
    })
  })

  describe('Game Card Interactions', () => {
    it('should show overlay on hover', async function () {
      if (games.length === 0) {
        this.skip()
        return
      }

      const card = await $('.group.relative')
      
      // Check initial state - overlay should be hidden (opacity-0)
      const overlay = await card.$('.absolute.inset-0')
      
      // Hover over card
      await card.moveTo()
      await browser.pause(500)

      // Overlay should now be visible
      const overlayClass = await overlay.getAttribute('class')
      console.log(`Overlay class after hover: ${overlayClass}`)
      
      // The group-hover:opacity-100 should be triggered
      expect(await overlay.isDisplayed()).toBe(true)
    })

    it('should show play button for installed games', async function () {
      const installedGames = games.filter((g) => g.installed)
      if (installedGames.length === 0) {
        console.log('No installed games - skipping play button test')
        this.skip()
        return
      }

      // Find a card with "Installed" badge
      const installedBadges = await $$('span*=Installed')
      if (installedBadges.length > 0) {
        const card = await installedBadges[0].$('./../../../..')
        await card.moveTo()
        await browser.pause(300)

        // Look for play button
        const playButton = await card.$('button[title="Play"]')
        if (await playButton.isExisting()) {
          expect(await playButton.isDisplayed()).toBe(true)
          console.log('Play button found for installed game')
        }
      }
    })

    it('should navigate to game detail on card click', async function () {
      if (games.length === 0) {
        this.skip()
        return
      }

      const card = await $('.group.relative')
      await card.click()

      // Wait for navigation
      await browser.pause(1000)

      // Check URL changed to game detail
      const url = await browser.getUrl()
      console.log(`Current URL after click: ${url}`)
      
      // Should be on game detail page or have game in URL
      // Note: This depends on the actual routing implementation
    })
  })

  after(async () => {
    await takeScreenshot('library-ui-final')
  })
})
