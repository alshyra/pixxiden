/**
 * Pixxiden E2E Test Selectors
 *
 * Centralized selectors for all UI elements.
 * Uses data-testid where available, CSS classes / text as fallback.
 */

export const Selectors = {
  // App Shell
  app: "#app",

  // Library View (LibraryFullscreen.vue)
  library: {
    view: '[data-testid="library-view"]',
    loading: '[data-testid="library-loading"]',
    empty: '[data-testid="library-empty"]',
    gameCount: '[data-testid="game-count"]',
    carousel: '[data-testid="game-carousel"]',
  },

  // Hero Banner (HeroBanner.vue)
  hero: {
    banner: '[data-testid="hero-banner"]',
    title: '[data-testid="hero-title"]',
  },

  // Top Filters (TopFilters.vue)
  filters: {
    nav: '[data-testid="top-filters"]',
    all: '[data-testid="filter-tous"]',
    installed: '[data-testid="filter-installés"]',
    epic: '[data-testid="filter-epic"]',
    gog: '[data-testid="filter-gog"]',
    amazon: '[data-testid="filter-amazon"]',
    steam: '[data-testid="filter-steam"]',
  },

  // Game Card (GameCard.vue)
  gameCard: {
    card: '[data-testid="game-card"]',
    // dynamic: [data-id="<gameId>"]
  },

  // Game Detail (GameDetails.vue)
  gameDetail: {
    view: '[data-testid="game-detail"]',
    synopsis: '[data-testid="game-synopsis"]',
    description: '[data-testid="game-description"]',
  },

  // Game Info Card (GameInfoCard.vue)
  gameInfo: {
    title: '[data-testid="game-info-title"]',
    developer: '[data-testid="game-info-developer"]',
  },

  // Game Actions (GameActions.vue)
  gameActions: {
    installButton: '[data-testid="install-button"]',
    playButton: '[data-testid="play-button"]',
    forceCloseButton: '[data-testid="force-close-button"]',
  },

  // Downloads View (DownloadsView.vue)
  downloads: {
    view: '[data-testid="downloads-view"]',
  },

  // Settings View (SettingsView.vue)
  settings: {
    view: '[data-testid="settings-view"]',
    navSystem: '[data-testid="settings-nav-/settings/system"]',
    navStore: '[data-testid="settings-nav-/settings/store"]',
    navApiKeys: '[data-testid="settings-nav-/settings/api-keys"]',
    navAdvanced: '[data-testid="settings-nav-/settings/advanced"]',
  },

  // Store Settings (StoresSettings.vue / StoreCard.vue)
  storeSettings: {
    epicCard: '[data-testid="store-card-epic"]',
    gogCard: '[data-testid="store-card-gog"]',
    amazonCard: '[data-testid="store-card-amazon"]',
    steamCard: '[data-testid="store-card-steam"]',
    epicConnect: '[data-testid="epic-connect-button"]',
    gogConnect: '[data-testid="gog-connect-button"]',
    amazonConnect: '[data-testid="amazon-connect-button"]',
    epicDisconnect: '[data-testid="epic-disconnect-button"]',
    gogDisconnect: '[data-testid="gog-disconnect-button"]',
    amazonDisconnect: '[data-testid="amazon-disconnect-button"]',
  },

  // Console Footer (ConsoleFooter.vue)
  footer: {
    container: ".console-footer",
    statusDot: ".status-dot",
    statusText: ".status-text",
  },
};

export default Selectors;
