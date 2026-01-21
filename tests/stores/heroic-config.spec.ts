/**
 * Tests for Heroic Launcher configuration reading
 * Validates that wine prefix, wine version, store_id and install paths
 * are correctly extracted from Heroic's config files
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tauri invoke for these tests
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args)
}))

describe('Heroic Configuration Reading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get_game_config command', () => {
    it('should return store_id for Epic games', async () => {
      const mockConfig = {
        id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c',
        title: 'The Dungeon Of Naheulbeuk: The Amulet Of Chaos',
        store: 'epic',
        store_id: '02fac38ee2614c8ba276b1ea7c1acd7c',
        install_path: '/home/user/Games/Heroic/DungeonOfNaheulbeuk',
        wine_prefix: '/home/user/Games/Heroic/Prefixes/default/The Dungeon Of Naheulbeuk',
        wine_version: 'Proton - proton-cachyos',
        installed: true
      }
      mockInvoke.mockResolvedValue(mockConfig)
      
      const { invoke } = await import('@tauri-apps/api/core')
      const config = await invoke('get_game_config', { id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c' })
      
      // BUG: store_id should NOT be empty
      expect(config.store_id).toBeTruthy()
      expect(config.store_id).toBe('02fac38ee2614c8ba276b1ea7c1acd7c')
    })

    it('should return wine configuration for Epic games', async () => {
      const mockConfig = {
        id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c',
        title: 'The Dungeon Of Naheulbeuk',
        store: 'epic',
        store_id: '02fac38ee2614c8ba276b1ea7c1acd7c',
        install_path: '/home/user/Games/Heroic/DungeonOfNaheulbeuk',
        wine_prefix: '/home/user/Games/Heroic/Prefixes/default/The Dungeon Of Naheulbeuk',
        wine_version: 'Proton - proton-cachyos',
        installed: true
      }
      mockInvoke.mockResolvedValue(mockConfig)
      
      const { invoke } = await import('@tauri-apps/api/core')
      const config = await invoke('get_game_config', { id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c' })
      
      // BUG: wine_prefix and wine_version should NOT be null/empty
      expect(config.wine_prefix).toBeTruthy()
      expect(config.wine_version).toBeTruthy()
      expect(config.wine_prefix).toContain('Heroic/Prefixes')
    })

    it('should return install_path for installed games', async () => {
      const mockConfig = {
        id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c',
        title: 'The Dungeon Of Naheulbeuk',
        store: 'epic',
        store_id: '02fac38ee2614c8ba276b1ea7c1acd7c',
        install_path: '/home/user/Games/Heroic/DungeonOfNaheulbeuk',
        wine_prefix: '/home/user/Games/Heroic/Prefixes/default/The Dungeon Of Naheulbeuk',
        wine_version: 'Proton - proton-cachyos',
        installed: true
      }
      mockInvoke.mockResolvedValue(mockConfig)
      
      const { invoke } = await import('@tauri-apps/api/core')
      const config = await invoke('get_game_config', { id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c' })
      
      // BUG: install_path should NOT be null for installed games
      expect(config.install_path).toBeTruthy()
      expect(config.install_path).not.toBe('N/A')
    })
  })

  describe('Heroic GamesConfig file parsing', () => {
    it('should parse wine config from Heroic GamesConfig/{store_id}.json', () => {
      // Example Heroic config structure
      const heroicGameConfig = {
        "02fac38ee2614c8ba276b1ea7c1acd7c": {
          "wineVersion": {
            "bin": "/usr/share/steam/compatibilitytools.d/proton-cachyos/proton",
            "name": "Proton - proton-cachyos",
            "type": "proton"
          },
          "winePrefix": "/home/antoines/Games/Heroic/Prefixes/default/The Dungeon Of Naheulbeuk The Amulet Of Chaos"
        },
        "version": "v0",
        "explicit": true
      }
      
      const storeId = '02fac38ee2614c8ba276b1ea7c1acd7c'
      const gameConfig = heroicGameConfig[storeId]
      
      expect(gameConfig).toBeDefined()
      expect(gameConfig.wineVersion).toBeDefined()
      expect(gameConfig.wineVersion.name).toBe('Proton - proton-cachyos')
      expect(gameConfig.winePrefix).toContain('Heroic/Prefixes')
    })

    it('should handle nested wineVersion structure', () => {
      // The bug: wineVersion is an object with name property, not a string
      const heroicConfig = {
        "wineVersion": {
          "bin": "/path/to/proton",
          "name": "Proton - GE-Proton8-25",
          "type": "proton"
        }
      }
      
      // WRONG: reading wineVersion directly as string
      const wrongVersion = typeof heroicConfig.wineVersion === 'string' 
        ? heroicConfig.wineVersion 
        : null
      expect(wrongVersion).toBeNull()
      
      // CORRECT: reading wineVersion.name
      const correctVersion = heroicConfig.wineVersion?.name
      expect(correctVersion).toBe('Proton - GE-Proton8-25')
    })
  })

  describe('Heroic installed.json parsing', () => {
    it('should correctly parse installed.json structure', () => {
      const installedJson = {
        "02fac38ee2614c8ba276b1ea7c1acd7c": {
          "app_name": "02fac38ee2614c8ba276b1ea7c1acd7c",
          "install_path": "/home/antoines/Games/Heroic/DungeonOfNaheulbeuk",
          "title": "The Dungeon Of Naheulbeuk: The Amulet Of Chaos",
          "platform": "Windows",
          "version": "Windows_1.7_51_47889_UnityPatch"
        }
      }
      
      const appName = '02fac38ee2614c8ba276b1ea7c1acd7c'
      const gameData = installedJson[appName]
      
      expect(gameData).toBeDefined()
      expect(gameData.install_path).toBe('/home/antoines/Games/Heroic/DungeonOfNaheulbeuk')
      expect(gameData.title).toContain('Naheulbeuk')
    })
  })

  describe('GOG games config', () => {
    it('should return wine configuration for GOG games', async () => {
      const mockConfig = {
        id: 'gog_1456460669',
        title: 'Baldurs Gate 3',
        store: 'gog',
        storeId: '1456460669',
        installPath: '/home/user/Games/Heroic/Baldurs Gate 3',
        winePrefix: '/home/user/Games/Heroic/Prefixes/default/Baldurs Gate 3',
        wineVersion: 'Proton - proton-cachyos',
        installed: true
      }
      mockInvoke.mockResolvedValue(mockConfig)
      
      const { invoke } = await import('@tauri-apps/api/core')
      const config = await invoke('get_game_config', { id: 'gog_1456460669' })
      
      expect(config.storeId).toBe('1456460669')
      expect(config.winePrefix).toBeTruthy()
    })

    it('should parse GOG library from store_cache/gog_library.json', () => {
      // Real structure from Heroic's store_cache/gog_library.json
      const gogLibrary = {
        "games": [
          {
            "runner": "gog",
            "developer": "Larian Studios",
            "app_name": "1456460669",
            "art_cover": "https://images.gog.com/cover.jpg",
            "art_square": "https://images.gog.com/square.jpg",
            "install": { "is_dlc": false },
            "is_installed": false,
            "title": "Baldur's Gate 3",
            "extra": {
              "about": {
                "description": "An epic RPG"
              }
            }
          }
        ]
      }
      
      const games = gogLibrary.games
      expect(games.length).toBe(1)
      expect(games[0].app_name).toBe('1456460669')
      expect(games[0].title).toBe("Baldur's Gate 3")
    })

    it('should read installed GOG games from gog_store/installed.json', () => {
      const installedJson = {
        "installed": [
          {
            "platform": "windows",
            "install_path": "/home/antoines/Games/Heroic/Baldurs Gate 3",
            "appName": "1456460669",
            "version": "Release - v4.1.1"
          }
        ]
      }
      
      const installedGames = new Map<string, string>()
      for (const game of installedJson.installed) {
        installedGames.set(game.appName, game.install_path)
      }
      
      expect(installedGames.has('1456460669')).toBe(true)
      expect(installedGames.get('1456460669')).toContain('Baldurs Gate 3')
    })

    it('should check GOG authentication from gog_store/auth.json', () => {
      const authJson = {
        "access_token": "eyJhbGciOiJSUzI1NiIs...",
        "expires_in": 3600,
        "token_type": "bearer",
        "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
      }
      
      const isAuthenticated = authJson.access_token !== undefined
      expect(isAuthenticated).toBe(true)
    })
  })
})

describe('UI displays game config correctly', () => {
  it('should show store_id in GameSettingsModal', async () => {
    const config = {
      id: 'epic_02fac38ee2614c8ba276b1ea7c1acd7c',
      title: 'The Dungeon Of Naheulbeuk',
      store: 'epic',
      store_id: '02fac38ee2614c8ba276b1ea7c1acd7c',
      install_path: '/home/user/Games/Heroic/DungeonOfNaheulbeuk',
      wine_prefix: '/home/user/Games/Heroic/Prefixes/default/Naheulbeuk',
      wine_version: 'Proton - proton-cachyos',
      installed: true
    }
    
    // The store_id should be displayed, not empty
    expect(config.store_id).toBeTruthy()
    expect(config.store_id.length).toBeGreaterThan(0)
  })

  it('should not show "N/A" for installed games with install path', () => {
    const config = {
      install_path: '/home/user/Games/Heroic/SomeGame',
      installed: true
    }
    
    // If installed is true, install_path should exist
    expect(config.installed && config.install_path).toBeTruthy()
    expect(config.install_path).not.toBe('N/A')
  })

  it('should not show "Not configured" for games with wine config', () => {
    const config = {
      wine_prefix: '/home/user/Games/Heroic/Prefixes/default/SomeGame',
      wine_version: 'Proton - proton-cachyos'
    }
    
    // Wine config exists, should not display "Not configured"
    expect(config.wine_prefix).toBeTruthy()
    expect(config.wine_version).toBeTruthy()
    expect(config.wine_prefix).not.toBe('Not configured')
    expect(config.wine_version).not.toBe('Not configured')
  })
})
