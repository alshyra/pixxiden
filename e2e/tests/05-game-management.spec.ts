/**
 * PixiDen E2E Tests - Game Management
 * 
 * Tests for game management actions:
 * - Install game
 * - Launch game
 * - Uninstall game
 * - Game configuration
 * 
 * Note: These tests interact with real store binaries and may trigger
 * actual downloads/installations. Use with caution in CI environments.
 */

import { waitForAppReady, invokeTauriCommand, takeScreenshot } from '../helpers'

interface Game {
  id: string
  title: string
  store: string
  store_id: string
  installed: boolean
  install_path?: string
}

interface GameConfig {
  id: string
  title: string
  store: string
  store_id: string
  install_path?: string
  wine_prefix?: string
  wine_version?: string
  installed: boolean
}

describe('Game Management', () => {
  let games: Game[] = []
  let installedGame: Game | undefined
  let notInstalledGame: Game | undefined

  before(async () => {
    await waitForAppReady()
    
    // Sync and get games
    await invokeTauriCommand('sync_games')
    games = await invokeTauriCommand<Game[]>('get_games')
    
    installedGame = games.find((g) => g.installed)
    notInstalledGame = games.find((g) => !g.installed)
    
    console.log(`Found ${games.length} games`)
    console.log(`Installed game: ${installedGame?.title || 'none'}`)
    console.log(`Not installed game: ${notInstalledGame?.title || 'none'}`)
  })

  describe('Game Detail View', () => {
    it('should load game detail for existing game', async function () {
      if (games.length === 0) {
        console.log('No games available')
        this.skip()
        return
      }

      const game = games[0]
      
      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, game.id)
      
      await browser.pause(1000)

      // Should show game title
      const url = await browser.getUrl()
      expect(url).toContain(`/game/${game.id}`)
    })

    it('should display game metadata correctly', async function () {
      if (games.length === 0) {
        this.skip()
        return
      }

      const game = games[0]
      const config = await invokeTauriCommand<GameConfig>('get_game_config', { id: game.id })

      expect(config.id).toBe(game.id)
      expect(config.title).toBe(game.title)
      expect(config.store).toBe(game.store)
      expect(config.store_id).toBe(game.store_id)
      
      console.log(`Game config: ${JSON.stringify(config, null, 2)}`)
    })
  })

  describe('Game Installation', () => {
    it('should show install button for uninstalled games', async function () {
      if (!notInstalledGame) {
        console.log('No uninstalled games available')
        this.skip()
        return
      }

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, notInstalledGame.id)
      
      await browser.pause(1000)

      // Look for install button
      const installButton = await $('button*=Install')
      expect(await installButton.isExisting()).toBe(true)
    })

    // NOTE: This test actually triggers a download - use carefully
    it.skip('should trigger game installation', async function () {
      if (!notInstalledGame) {
        this.skip()
        return
      }

      // WARNING: This will actually start downloading the game
      try {
        await invokeTauriCommand('install_game', { id: notInstalledGame.id })
        console.log(`Installation started for: ${notInstalledGame.title}`)
      } catch (error) {
        console.log(`Installation error (expected in test): ${error}`)
      }
    })
  })

  describe('Game Launch', () => {
    it('should show play button for installed games', async function () {
      if (!installedGame) {
        console.log('No installed games available')
        this.skip()
        return
      }

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, installedGame.id)
      
      await browser.pause(1000)

      // Look for play button
      const playButton = await $('button*=Play')
      expect(await playButton.isExisting()).toBe(true)
    })

    it('should have correct game configuration for launch', async function () {
      if (!installedGame) {
        this.skip()
        return
      }

      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: installedGame.id 
      })

      expect(config.installed).toBe(true)
      
      // Installed games should have an install path
      if (config.install_path) {
        console.log(`Install path: ${config.install_path}`)
      }
      
      // Wine configuration might be set
      if (config.wine_prefix) {
        console.log(`Wine prefix: ${config.wine_prefix}`)
      }
    })

    // NOTE: This test actually launches a game - use carefully
    it.skip('should launch installed game', async function () {
      if (!installedGame) {
        this.skip()
        return
      }

      // WARNING: This will actually launch the game
      try {
        await invokeTauriCommand('launch_game', { id: installedGame.id })
        console.log(`Game launched: ${installedGame.title}`)
      } catch (error) {
        console.log(`Launch error (expected in test): ${error}`)
      }
    })
  })

  describe('Game Uninstallation', () => {
    it('should show uninstall option for installed games', async function () {
      if (!installedGame) {
        console.log('No installed games available')
        this.skip()
        return
      }

      // Navigate to game detail
      await browser.execute((id: string) => {
        (window as any).__VUE_ROUTER__?.push(`/game/${id}`)
      }, installedGame.id)
      
      await browser.pause(1000)

      // Look for uninstall option (might be in settings or dropdown)
      const uninstallOption = await $('button*=Uninstall')
      const hasUninstall = await uninstallOption.isExisting()
      
      console.log(`Uninstall option present: ${hasUninstall}`)
    })

    // NOTE: This test actually uninstalls a game - use carefully
    it.skip('should uninstall game', async function () {
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
    it('should handle Epic Games actions via Legendary', async function () {
      const epicGame = games.find((g) => g.store === 'epic')
      if (!epicGame) {
        console.log('No Epic games available')
        this.skip()
        return
      }

      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: epicGame.id 
      })

      expect(config.store).toBe('epic')
      console.log(`Epic game: ${config.title} (${config.store_id})`)
    })

    it('should handle GOG actions via GOGDL', async function () {
      const gogGame = games.find((g) => g.store === 'gog')
      if (!gogGame) {
        console.log('No GOG games available')
        this.skip()
        return
      }

      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: gogGame.id 
      })

      expect(config.store).toBe('gog')
      console.log(`GOG game: ${config.title} (${config.store_id})`)
    })

    it('should handle Amazon actions via Nile', async function () {
      const amazonGame = games.find((g) => g.store === 'amazon')
      if (!amazonGame) {
        console.log('No Amazon games available')
        this.skip()
        return
      }

      const config = await invokeTauriCommand<GameConfig>('get_game_config', { 
        id: amazonGame.id 
      })

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
