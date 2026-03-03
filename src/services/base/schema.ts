/**
 * SQLite Database Schema for Pixxiden
 * All tables for games, auth tokens, enrichment cache, and settings
 */

export const SCHEMA = `
-- Games table (main library)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  store TEXT NOT NULL CHECK(store IN ('epic', 'gog', 'amazon', 'steam')),
  title TEXT NOT NULL,
  installed INTEGER DEFAULT 0,
  install_path TEXT,
  install_size TEXT,
  executable_path TEXT,
  custom_executable TEXT,
  wine_prefix TEXT,
  wine_version TEXT,
  runner TEXT,
  
  -- Cloud save support flag
  cloud_save_support INTEGER DEFAULT 0,
  
  -- Metadata (from IGDB)
  description TEXT,
  summary TEXT,
  metacritic_score INTEGER,
  igdb_rating INTEGER,
  developer TEXT,
  publisher TEXT,
  genres TEXT DEFAULT '[]',
  release_date TEXT,
  
  -- Time to beat (from IGDB game_time_to_beats — hours)
  hltb_main REAL,
  hltb_main_extra REAL,
  hltb_complete REAL,
  hltb_speedrun REAL,
  
  -- umu-launcher ID (from https://umu.openwinecomponents.org)
  umu_id TEXT,

  -- Compatibility (from ProtonDB)
  proton_tier TEXT,
  proton_confidence TEXT,
  proton_trending_tier TEXT,
  steam_app_id INTEGER,
  
  -- Achievements
  achievements_total INTEGER,
  achievements_unlocked INTEGER,
  
  -- Assets (local file paths, aligned with SteamGridDB types)
  hero_path TEXT,
  grid_path TEXT,
  horizontal_grid_path TEXT,
  logo_path TEXT,
  icon_path TEXT,
  screenshot_paths TEXT DEFAULT '[]',
  
  -- User data
  is_favorite INTEGER DEFAULT 0,
  play_time_minutes INTEGER DEFAULT 0,
  last_played TEXT,
  downloading INTEGER DEFAULT 0,
  download_progress REAL,
  
  -- Installed platform (linux/windows/osx) — needed to decide if Proton is required at launch
  installed_platform TEXT DEFAULT '',

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  enriched_at TEXT
);

-- Auth tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  store TEXT PRIMARY KEY CHECK(store IN ('epic', 'gog', 'amazon', 'steam')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  config_source TEXT DEFAULT 'pixxiden'
);

-- Enrichment cache table
CREATE TABLE IF NOT EXISTS enrichment_cache (
  game_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  data TEXT,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, provider),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_store ON games(store);
CREATE INDEX IF NOT EXISTS idx_games_installed ON games(installed);
CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_game_id ON enrichment_cache(game_id);
`;

// Migrations are sequential and idempotent.
// Columns already in the base CREATE TABLE do NOT need a migration.
// After a --nuke reset, all migrations run on a fresh DB — use IF NOT EXISTS / ADD COLUMN safely.
export const MIGRATIONS: string[] = [
  // Migration 1: Add is_favorite column for game favorites
  `ALTER TABLE games ADD COLUMN is_favorite INTEGER DEFAULT 0`,
  // Migration 2: (removed — cover_path eliminated)
  `SELECT 1`,
  // Migration 3: (folded into base schema)
  `SELECT 1`,
  // Migration 4: Add cloud_save_support flag
  `ALTER TABLE games ADD COLUMN cloud_save_support INTEGER DEFAULT 0`,
  // Migration 5: (folded into base schema)
  `SELECT 1`,
  // Migration 6: Add runner_path for Heroic-configured Proton/Wine binary path
  `ALTER TABLE games ADD COLUMN runner_path TEXT`,
  // Migration 7: Image overrides table — user-chosen images that survive re-enrichment
  `CREATE TABLE IF NOT EXISTS image_overrides (
    game_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('hero','grid','horizontal_grid','logo','icon')),
    path TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, asset_type),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  )`,
  // Migration 8: UMU database table — local cache of the umu-launcher API
  // Replaces hundreds of individual HTTP requests with a single bulk fetch
  `CREATE TABLE IF NOT EXISTS umu_database (
    umu_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    codename TEXT,
    store TEXT,
    acronym TEXT,
    exe_string TEXT,
    notes TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  // Migration 9: Indexes for fast UMU lookups by codename, title, and store
  `CREATE INDEX IF NOT EXISTS idx_umu_codename ON umu_database(codename)`,
  `CREATE INDEX IF NOT EXISTS idx_umu_title ON umu_database(title)`,
  `CREATE INDEX IF NOT EXISTS idx_umu_store ON umu_database(store)`,
  // Migration 10: Add installed_platform for GOG/Epic games — 'linux', 'windows', 'osx', or '' for unknown
  `ALTER TABLE games ADD COLUMN installed_platform TEXT DEFAULT ''`,
];
