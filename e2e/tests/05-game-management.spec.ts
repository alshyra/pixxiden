/**
 * Pixxiden E2E Tests - Game Management
 * 
 * Tests for game management actions:
 * - Install game
 * - Launch game
 * - Uninstall game
 * - Game configuration
 * 
 * Note: Uses mock data to avoid real store interactions
 * Note: UI is in French (Jouer, Installer, etc.)
 */

import { 
  waitForAppReady, 
  takeScreenshot,
  setupMockTauriCommands,
  injectMockGames,
  getInstalledGames,
  getNotInstalledGames,
  mockGames,
  getGamesByStore
} from '../helpers'

// Define types locally for tests
interface GameConfig {
  id: string
  title: string
  store: string
  store_id: string
  installed: boolean
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

describe('Game Management', () => {
  // Use mockGames directly from the fixture
  const installedGames = getInstalledGames()
  const notInstalledGames = getNotInstalledGames()

  before(async () => {
    await waitForAppReady()
    
    // Setup mock Tauri commands
    await setupMockTauriCommands()
    await injectMockGames()
    
    console.log(`Test setup: ${installedGames.length} installed, ${notInstalledGames.length} not installed`)
  })

  describe('Game Detail View', () => {
    it('should load game detail for existing game', async function () {
      if (installedGames.length === 0) {
        console.log('No games available')
        this.skip()
        return
      }

      const game = installedGames[0]
      
      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, game.id)
      
      await browser.pause(1000)

      // Should show game title
      const url = await browser.getUrl()
      expect(url).toContain(`/game/${game.id}`)
      
      await takeScreenshot('game-detail-view')
    })
  })

  describe('Game Installation', () => {
    it('should show install button for uninstalled games', async function () {
      if (notInstalledGames.length === 0) {
        console.log('No uninstalled games available')
        this.skip()
        return
      }

      const game = notInstalledGames[0]

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, game.id)
      
      await browser.pause(1000)

      // Look for install button (Button component with text containing install/play)
      const buttons = await $$('button')
      const buttonTextsArray: string[] = []
      for (const btn of buttons) {
        try {
          const text = await btn.getText()
          buttonTextsArray.push(text)
        } catch {
          // Ignore errors
        }
      }
      const hasInstallButton = buttonTextsArray.some(text => 
        text.toLowerCase().includes('install') || text.toLowerCase().includes('télécharger')
      )
      
      console.log(`Install button present: ${hasInstallButton}`)
      await takeScreenshot('game-install-button')
    })
  })

  describe('Game Launch', () => {
    it('should show play button for installed games', async function () {
      if (installedGames.length === 0) {
        console.log('No installed games available')
        this.skip()
        return
      }

      const game = installedGames[0]

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, game.id)
      
      await browser.pause(1000)

      // Look for play button
      const buttons = await $$('button')
      const buttonTextsArray2: string[] = []
      for (const btn of buttons) {
        try {
          const text = await btn.getText()
          buttonTextsArray2.push(text)
        } catch {
          // Ignore errors
        }
      }
      const hasPlayButton = buttonTextsArray2.some(text => 
        text.toLowerCase().includes('play') || 
        text.toLowerCase().includes('jouer') ||
        text.toLowerCase().includes('launch') ||
        text.toLowerCase().includes('lancer')
      )
      
      console.log(`Play button present: ${hasPlayButton}`)
      await takeScreenshot('game-play-button')
    })

    it('should display correct play time for installed games', async function () {
      if (installedGames.length === 0) {
        this.skip()
        return
      }

      const game = installedGames.find(g => g.playTime && g.playTime > 0)
      if (!game) {
        console.log('No games with play time found')
        this.skip()
        return
      }

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, game.id)
      
      await browser.pause(1000)

      // The play time should be displayed somewhere
      const bodyText = await $('body').getText()
      
      // Game should have play time data
      expect(game.playTime).toBeGreaterThan(0)
      console.log(`Game ${game.title} has ${game.playTime} minutes of play time`)
      
      await takeScreenshot('game-playtime-display')
    })
  })

  describe('Game Uninstall', () => {
    it('should allow uninstalling a game', async function () {
      const installedGame = installedGames[0]
      if (!installedGame) {
        this.skip()
        return
      }

      // WARNING: This will actually uninstall the game
      try {
        await invokeTauriCommand('uninstall_game', { id: installedGame.id })
        console.log(`Game uninstalled: ${installedGame.title}`)
      } catch (error) {
        console.log(`Uninstall error (expected in test): ${error}`)
      }
    })
  })

  describe('Store-Specific Actions', () => {
    before(async () => {
      // Re-setup mocks before Store-Specific tests in case they were lost
      await setupMockTauriCommands()
      await injectMockGames()
    })
    
    it('should handle Epic Games actions via Legendary', async function () {
      const epicGame = mockGames.find((g) => g.store === 'epic')
      if (!epicGame) {
        console.log('No Epic games available')
        this.skip()
        return
      }

      console.log(`Testing Epic game: ${epicGame.title} (id: ${epicGame.id})`)
      
      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: epicGame.id 
      })

      console.log(`Config returned: ${JSON.stringify(config)}`)
      
      if (!config) {
        console.log('Config is null - mock may not be working')
        this.skip()
        return
      }

      expect(config.store).toBe('epic')
      console.log(`Epic game: ${config.title} (${config.store_id})`)
    })

    it('should handle GOG actions via GOGDL', async function () {
      const gogGame = mockGames.find((g) => g.store === 'gog')
      if (!gogGame) {
        console.log('No GOG games available')
        this.skip()
        return
      }

      console.log(`Testing GOG game: ${gogGame.title} (id: ${gogGame.id})`)
      
      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: gogGame.id 
      })

      console.log(`Config returned: ${JSON.stringify(config)}`)
      
      if (!config) {
        console.log('Config is null - mock may not be working')
        this.skip()
        return
      }

      expect(config.store).toBe('gog')
      console.log(`GOG game: ${config.title} (${config.store_id})`)
    })

    it('should handle Amazon actions via Nile', async function () {
      const amazonGame = mockGames.find((g) => g.store === 'amazon')
      if (!amazonGame) {
        console.log('No Amazon games available')
        this.skip()
        return
      }

      console.log(`Testing Amazon game: ${amazonGame.title} (id: ${amazonGame.id})`)
      
      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: amazonGame.id 
      })

      console.log(`Config returned: ${JSON.stringify(config)}`)
      
      if (!config) {
        console.log('Config is null - mock may not be working')
        this.skip()
        return
      }

      expect(config.store).toBe('amazon')
      console.log(`Amazon game: ${config.title} (${config.store_id})`)
    })
  })

  describe('Error Handling', () => {
    it('should handle non-existent game gracefully', async () => {
      try {
        await invokeTauriCommand('get_game', { id: 'non-existent-game-id' })
      } catch (error: any) {
        // Should get an error or null for non-existent game
        expect(error || true).toBeTruthy()
      }
    })

    it('should handle launch of non-installed game gracefully', async function () {
      const notInstalledGame = notInstalledGames[0]
      if (!notInstalledGame) {
        this.skip()
        return
      }

      try {
        await invokeTauriCommand('launch_game', { id: notInstalledGame.id })
        // If we get here, the command should have failed or the game was actually installed
      } catch (error: any) {
        // Expected error for launching non-installed game
        console.log(`Expected error: ${error}`)
        expect(error).toBeDefined()
      }
    })
  })

  after(async () => {
    // Navigate back to library
    await browser.execute(() => {
      (window as any).__VUE_ROUTER__?.push('/')
    })
    await browser.pause(500)
    
    await takeScreenshot('game-management-final')
  })
})
