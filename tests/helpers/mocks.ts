/**
 * Centralized mock factories for Pixxiden tests
 * Provides reusable factories to create mock objects for testing
 *
 * IMPORTANT: vi.mock() calls are in tests/helpers/setup.ts for proper hoisting.
 * This file only contains factory functions to create test data and mock objects.
 */

import { vi } from "vitest";

// ============================================================================
// Service Mock Factories
// ============================================================================

/**
 * Create a mock GameLibraryOrchestrator with all common methods
 */
export function createMockOrchestrator() {
  return {
    getAllGames: vi.fn().mockResolvedValue([]),
    syncLibrary: vi.fn().mockResolvedValue({
      total: 0,
      enriched: 0,
      errors: [],
    }),
    prepareGameLaunch: vi.fn().mockResolvedValue({
      game: null,
      launchCommand: "",
      env: {},
    }),
    updateGameMetadata: vi.fn().mockResolvedValue(undefined),
    searchGames: vi.fn().mockResolvedValue([]),
    getRecentlyPlayed: vi.fn().mockResolvedValue([]),
    getFavorites: vi.fn().mockResolvedValue([]),
    updateExecutablePath: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock GameInstallationService
 */
export function createMockInstallationService() {
  return {
    installGame: vi.fn().mockResolvedValue(undefined),
    uninstallGame: vi.fn().mockResolvedValue(undefined),
    getInstallStatus: vi.fn().mockResolvedValue({ installed: false }),
    cancelInstallation: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock GameLaunchService
 */
export function createMockLaunchService() {
  return {
    launchFromCommand: vi.fn().mockResolvedValue(undefined),
    launch: vi.fn().mockResolvedValue(undefined),
    isGameRunning: vi.fn().mockResolvedValue(false),
    stopGame: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock AuthStore
 */
export function createMockAuthStore() {
  return {
    loginEpic: vi.fn().mockResolvedValue(undefined),
    loginGog: vi.fn().mockResolvedValue(undefined),
    loginAmazon: vi.fn().mockResolvedValue(undefined),
    loginAmazonWith2FA: vi.fn().mockResolvedValue(undefined),
    loginSteam: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    checkStoreStatus: vi.fn().mockResolvedValue({
      epic: "logged_out",
      gog: "logged_out",
      amazon: "logged_out",
      steam: "logged_out",
    }),
    authStatus: {
      epic: "logged_out",
      gog: "logged_out",
      amazon: "logged_out",
      steam: "logged_out",
    },
  };
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock Game object for testing
 */
export function createMockGame(id = "game-1", overrides: Partial<any> = {}) {
  return {
    id,
    title: `Test Game ${id}`,
    storeData: {
      store: "epic",
      storeId: id,
      appName: id,
      ...overrides.storeData,
    },
    installation: {
      installed: false,
      installPath: "",
      executablePath: "",
      ...overrides.installation,
    },
    gameCompletion: {
      lastPlayed: null,
      downloading: false,
      downloadProgress: 0,
      isFavorite: false,
      ...overrides.gameCompletion,
    },
    metadata: {
      description: "Test game description",
      releaseDate: "2024-01-01",
      ...overrides.metadata,
    },
    ...overrides,
  };
}

/**
 * Create a mock Store configuration for testing
 */
export function createMockStore(type: "epic" | "gog" | "amazon" | "steam" = "epic") {
  return {
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    isAuthenticated: false,
    games: [],
  };
}

/**
 * Create mock IGDB data for enrichment tests
 */
export function createMockIgdbData(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Test Game",
    summary: "A test game description",
    cover: {
      url: "//images.igdb.com/igdb/image/upload/t_cover_big/test.jpg",
    },
    first_release_date: 1704067200, // 2024-01-01
    genres: [{ id: 5, name: "Shooter" }],
    ...overrides,
  };
}

/**
 * Create mock SteamGridDB data for enrichment tests
 */
export function createMockSteamGridDbData(overrides: Partial<any> = {}) {
  return {
    grids: [
      {
        url: "https://cdn2.steamgriddb.com/file/sgdb-cdn/grid/test.png",
        thumb: "https://cdn2.steamgriddb.com/file/sgdb-cdn/thumb/test.png",
      },
    ],
    heroes: [
      {
        url: "https://cdn2.steamgriddb.com/file/sgdb-cdn/hero/test.png",
        thumb: "https://cdn2.steamgriddb.com/file/sgdb-cdn/thumb/test.png",
      },
    ],
    logos: [
      {
        url: "https://cdn2.steamgriddb.com/file/sgdb-cdn/logo/test.png",
      },
    ],
    ...overrides,
  };
}

/**
 * Create mock ProtonDB data for compatibility tests
 */
export function createMockProtonDbData(tier = "platinum", overrides: Partial<any> = {}) {
  return {
    tier,
    confidence: "high",
    score: 0.95,
    total: 100,
    ...overrides,
  };
}
