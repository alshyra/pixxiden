/**
 * Pixxiden E2E Test Selectors
 *
 * Centralized selectors for all UI elements.
 * Uses data-testid where available, CSS classes / text as fallback.
 */

export const Selectors = {
  // App Shell
  app: "#app",

  // Library View (LibraryContent.vue + LibraryLayout.vue)
  library: {
    view: '[data-testid="library-view"]',
    loading: '[data-testid="library-loading"]',
    empty: '[data-testid="library-empty"]',
    gameCount: '[data-testid="game-count"]',
    carousel: '[data-testid="game-carousel"]',
  },

  // Hero Banner (GameHeroSection.vue — used in LibraryLayout)
  hero: {
    banner: '[data-testid="hero-banner"]',
    title: '[data-testid="hero-title"]',
    meta: '[data-testid="hero-meta"]',
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

  // Game Detail (GameDetailContent.vue)
  gameDetail: {
    view: '[data-testid="game-detail"]',
    // Synopsis tab in GameOverviewTab (first tab "Vue d'ensemble")
    synopsis: '[data-testid="game-synopsis"]',
    description: '[data-testid="game-description"]',
  },

  // Game Actions (GameActions.vue)
  // primary-action-button serves as both Install and Play button.
  // data-game-state="installed"     → Play mode
  // data-game-state="not-installed" → Install mode
  gameActions: {
    primaryActionButton: '[data-testid="primary-action-button"]',
    installButton: '[data-testid="primary-action-button"][data-game-state="not-installed"]',
    playButton: '[data-testid="primary-action-button"][data-game-state="installed"]',
    forceCloseButton: '[data-testid="force-close-button"]',
  },

  // Downloads View (DownloadsView.vue)
  downloads: {
    view: '[data-testid="downloads-view"]',
  },

  // Accounts View — /accounts (AccountsView.vue)
  accounts: {
    view: '[data-testid="accounts-view"]',
  },

  // System View — /system (SystemView.vue)
  system: {
    view: '[data-testid="system-view"]',
  },

  // Side Nav (SideNav.vue) — opened via "S" key or gamepad Options button
  sideNav: {
    nav: '[data-testid="side-nav"]',
    library: '[data-testid="sidenav-library"]',
    downloads: '[data-testid="sidenav-downloads"]',
    accounts: '[data-testid="sidenav-accounts"]',
    system: '[data-testid="sidenav-system"]',
  },

  // Store Settings (StoreCard.vue) — accessible in /accounts
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
