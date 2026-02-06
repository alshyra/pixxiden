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
  
  -- Metadata (from IGDB)
  description TEXT,
  summary TEXT,
  metacritic_score INTEGER,
  igdb_rating INTEGER,
  developer TEXT,
  publisher TEXT,
  genres TEXT DEFAULT '[]',
  release_date TEXT,
  
  -- Playtime (from HowLongToBeat)
  hltb_main REAL,
  hltb_main_extra REAL,
  hltb_complete REAL,
  hltb_speedrun REAL,
  
  -- Compatibility (from ProtonDB)
  proton_tier TEXT,
  proton_confidence TEXT,
  proton_trending_tier TEXT,
  steam_app_id INTEGER,
  
  -- Achievements
  achievements_total INTEGER,
  achievements_unlocked INTEGER,
  
  -- Assets (local file paths)
  hero_path TEXT,
  grid_path TEXT,
  logo_path TEXT,
  icon_path TEXT,
  
  -- Legacy URL assets
  cover_url TEXT,
  background_url TEXT,
  
  -- User data
  is_favorite INTEGER DEFAULT 0,
  play_time_minutes INTEGER DEFAULT 0,
  last_played TEXT,
  downloading INTEGER DEFAULT 0,
  download_progress REAL,
  
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

export const MIGRATIONS: string[] = [
  // Migration 1: Add is_favorite column for game favorites
  `ALTER TABLE games ADD COLUMN is_favorite INTEGER DEFAULT 0`,
];
