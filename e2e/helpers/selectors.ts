/**
 * Pixxiden E2E Test Selectors
 *
 * Centralized selectors for all UI elements tested.
 * Use data-testid attributes for reliable test selection.
 */

export const Selectors = {
  // App Shell
  app: "#app",
  mainContent: '[data-testid="main-content"]',
  loadingSpinner: '[data-testid="loading-spinner"]',

  // Navigation
  navLibrary: '[data-testid="nav-library"]',
  navDownloads: '[data-testid="nav-downloads"]',
  navSettings: '[data-testid="nav-settings"]',

  // Library View
  library: {
    container: '[data-testid="library-view"]',
    title: '[data-testid="library-title"]',
    gameGrid: '[data-testid="game-grid"]',
    gameCard: '[data-testid="game-card"]',
    gameTitle: '[data-testid="game-title"]',
    gameStore: '[data-testid="game-store"]',
    gameInstalled: '[data-testid="game-installed"]',
    emptyState: '[data-testid="empty-state"]',
    syncButton: '[data-testid="sync-button"]',
    syncSpinner: '[data-testid="sync-spinner"]',
  },

  // Store Filters
  filters: {
    container: '[data-testid="store-filters"]',
    all: '[data-testid="store-filter-all"]',
    epic: '[data-testid="store-filter-epic"]',
    gog: '[data-testid="store-filter-gog"]',
    amazon: '[data-testid="store-filter-amazon"]',
  },

  // Sort
  sort: {
    select: '[data-testid="sort-select"]',
    optionTitle: '[data-testid="sort-option-title"]',
    optionPlaytime: '[data-testid="sort-option-playtime"]',
    optionRecent: '[data-testid="sort-option-recent"]',
  },

  // Game Card Actions
  gameActions: {
    playButton: '[data-testid="play-button"]',
    installButton: '[data-testid="install-button"]',
    uninstallButton: '[data-testid="uninstall-button"]',
    settingsButton: '[data-testid="game-settings-button"]',
  },

  // Game Detail View
  gameDetail: {
    container: '[data-testid="game-detail"]',
    title: '[data-testid="game-detail-title"]',
    description: '[data-testid="game-detail-description"]',
    developer: '[data-testid="game-detail-developer"]',
    publisher: '[data-testid="game-detail-publisher"]',
    coverImage: '[data-testid="game-detail-cover"]',
    backgroundImage: '[data-testid="game-detail-background"]',
    playButton: '[data-testid="game-detail-play"]',
    installButton: '[data-testid="game-detail-install"]',
    backButton: '[data-testid="game-detail-back"]',
  },

  // Downloads View
  downloads: {
    container: '[data-testid="downloads-view"]',
    queue: '[data-testid="download-queue"]',
    item: '[data-testid="download-item"]',
    progress: '[data-testid="download-progress"]',
    cancelButton: '[data-testid="download-cancel"]',
    emptyState: '[data-testid="downloads-empty"]',
  },

  // Settings View
  settings: {
    container: '[data-testid="settings-view"]',
    sidebar: '[data-testid="settings-sidebar"]',
    content: '[data-testid="settings-content"]',

    // Settings Sections
    sectionStores: '[data-testid="settings-section-stores"]',
    sectionGeneral: '[data-testid="settings-section-general"]',
    sectionAppearance: '[data-testid="settings-section-appearance"]',

    // Store Settings
    stores: {
      legendary: {
        container: '[data-testid="store-legendary"]',
        status: '[data-testid="store-status-legendary"]',
        connectButton: '[data-testid="store-connect-legendary"]',
        disconnectButton: '[data-testid="store-disconnect-legendary"]',
        syncButton: '[data-testid="store-sync-legendary"]',
      },
      gogdl: {
        container: '[data-testid="store-gogdl"]',
        status: '[data-testid="store-status-gogdl"]',
        connectButton: '[data-testid="store-connect-gogdl"]',
        disconnectButton: '[data-testid="store-disconnect-gogdl"]',
        syncButton: '[data-testid="store-sync-gogdl"]',
      },
      nile: {
        container: '[data-testid="store-nile"]',
        status: '[data-testid="store-status-nile"]',
        connectButton: '[data-testid="store-connect-nile"]',
        disconnectButton: '[data-testid="store-disconnect-nile"]',
        syncButton: '[data-testid="store-sync-nile"]',
      },
    },
  },

  // Modals
  modal: {
    container: '[data-testid="modal"]',
    title: '[data-testid="modal-title"]',
    content: '[data-testid="modal-content"]',
    closeButton: '[data-testid="modal-close"]',
    confirmButton: '[data-testid="modal-confirm"]',
    cancelButton: '[data-testid="modal-cancel"]',
  },

  // Toast Notifications
  toast: {
    container: '[data-testid="toast"]',
    message: '[data-testid="toast-message"]',
    success: '[data-testid="toast-success"]',
    error: '[data-testid="toast-error"]',
    info: '[data-testid="toast-info"]',
  },
};

export default Selectors;
