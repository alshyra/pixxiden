//! Game Enricher - Orchestrates fetching metadata from multiple sources
//!
//! This service coordinates:
//! - SteamGridDB (visual assets)
//! - IGDB (game metadata)
//! - HowLongToBeat (game durations)
//! - ProtonDB (Linux compatibility)
//! - Achievements (Steam API, store CLIs)
//!
//! It uses the cache manager to avoid redundant API calls.

use crate::database::Game;
use crate::models::{EnrichedGame, GameMetadata};
use crate::services::{
    cache_manager::{AssetType, CacheManager},
    steamgriddb::SteamGridDBService,
    igdb::IGDBService,
    howlongtobeat::HowLongToBeatService,
    protondb::ProtonDBService,
    achievements::AchievementsService,
};
use anyhow::{Context, Result};
use chrono::Utc;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Configuration for the game enricher
#[derive(Debug, Clone)]
pub struct EnricherConfig {
    /// Maximum age of cached metadata before refresh (in days)
    pub cache_max_age_days: i64,
    /// Whether to fetch assets (can be disabled for faster initial load)
    pub fetch_assets: bool,
    /// Whether to fetch HLTB data
    pub fetch_hltb: bool,
    /// Whether to fetch ProtonDB data
    pub fetch_protondb: bool,
    /// Whether to fetch achievements
    pub fetch_achievements: bool,
}

impl Default for EnricherConfig {
    fn default() -> Self {
        Self {
            cache_max_age_days: 30,
            fetch_assets: true,
            fetch_hltb: true,
            fetch_protondb: true,
            fetch_achievements: true,
        }
    }
}

/// Game enricher service
pub struct GameEnricher {
    cache: CacheManager,
    steamgriddb: Option<SteamGridDBService>,
    igdb: Arc<Mutex<Option<IGDBService>>>,
    hltb: HowLongToBeatService,
    protondb: ProtonDBService,
    achievements: AchievementsService,
    config: EnricherConfig,
}

impl GameEnricher {
    /// Create a new game enricher
    pub fn new(config: EnricherConfig) -> Result<Self> {
        let cache = CacheManager::new()
            .context("Failed to create cache manager")?;
        
        // Try to create services from environment
        let steamgriddb = SteamGridDBService::from_env().ok();
        let igdb = IGDBService::from_env().ok();
        let achievements = AchievementsService::from_env();
        
        if steamgriddb.is_none() {
            log::warn!("SteamGridDB API key not configured, visual assets will not be fetched");
        }
        
        if igdb.is_none() {
            log::warn!("IGDB credentials not configured, game metadata will not be fetched");
        }
        
        if !achievements.can_fetch_steam() {
            log::warn!("Steam credentials not configured, Steam achievements will not be fetched");
        }
        
        Ok(Self {
            cache,
            steamgriddb,
            igdb: Arc::new(Mutex::new(igdb)),
            hltb: HowLongToBeatService::new(),
            protondb: ProtonDBService::new(),
            achievements,
            config,
        })
    }
    
    /// Initialize the enricher (create cache directories)
    pub async fn init(&self) -> Result<()> {
        self.cache.init().await
    }
    
    /// Enrich a single game with metadata and assets
    pub async fn enrich_game(&self, game: &Game) -> Result<EnrichedGame> {
        log::debug!("Enriching game: {} ({})", game.title, game.id);
        
        // Check if we have cached metadata
        let cached_metadata = self.cache.get_game_metadata(&game.id).await?;
        let is_stale = self.cache.is_metadata_stale(&game.id, self.config.cache_max_age_days).await;
        
        // Use cached data if available and not stale
        let metadata = if let Some(cached) = cached_metadata.filter(|_| !is_stale) {
            log::debug!("Using cached metadata for {}", game.title);
            cached
        } else {
            // Fetch new metadata
            log::info!("Fetching metadata for: {}", game.title);
            let new_metadata = self.fetch_metadata(game).await?;
            
            // Save to cache
            self.cache.save_game_metadata(&new_metadata).await?;
            
            new_metadata
        };
        
        // Build enriched game
        let enriched = self.build_enriched_game(game, &metadata).await;
        
        Ok(enriched)
    }
    
    /// Fetch all metadata for a game
    async fn fetch_metadata(&self, game: &Game) -> Result<GameMetadata> {
        let mut metadata = GameMetadata {
            game_id: game.id.clone(),
            fetched_at: Utc::now(),
            last_updated: Utc::now(),
            ..Default::default()
        };
        
        // Fetch IGDB metadata
        if let Some(igdb_metadata) = self.fetch_igdb_metadata(&game.title).await {
            metadata.igdb_id = Some(igdb_metadata.igdb_id);
            // Clone summary before moving it in the or() chain
            let summary_clone = igdb_metadata.summary.clone();
            metadata.description = igdb_metadata.description.or(summary_clone);
            metadata.summary = igdb_metadata.summary;
            metadata.metacritic_score = igdb_metadata.aggregated_rating.map(|r| r as u8);
            metadata.igdb_rating = igdb_metadata.rating;
            metadata.developer = igdb_metadata.developer;
            metadata.publisher = igdb_metadata.publisher;
            metadata.genres = igdb_metadata.genres;
            metadata.release_date = igdb_metadata.release_date;
            metadata.steam_app_id = igdb_metadata.steam_app_id;
        }
        
        // Fetch HLTB durations
        if self.config.fetch_hltb {
            if let Some(durations) = self.fetch_hltb_durations(&game.title).await {
                metadata.hltb_id = durations.game_id;
                metadata.hltb_main = durations.main_story;
                metadata.hltb_main_extra = durations.main_extra;
                metadata.hltb_complete = durations.completionist;
                metadata.hltb_speedrun = durations.speedrun;
            }
        }
        
        // Fetch ProtonDB compatibility (only if we have a Steam app ID)
        if self.config.fetch_protondb {
            if let Some(steam_app_id) = metadata.steam_app_id {
                if let Some(compat) = self.fetch_protondb_compat(steam_app_id).await {
                    metadata.proton_tier = compat.tier;
                    metadata.proton_confidence = compat.confidence;
                    metadata.proton_trending_tier = compat.trending_tier;
                }
            }
        }
        
        // Fetch achievements
        if self.config.fetch_achievements {
            if let Some(steam_app_id) = metadata.steam_app_id {
                if let Some(achievements) = self.fetch_steam_achievements(steam_app_id).await {
                    metadata.achievements_total = Some(achievements.total);
                    metadata.achievements_unlocked = Some(achievements.unlocked);
                }
            }
        }
        
        // Fetch and save assets
        if self.config.fetch_assets {
            let asset_paths = self.fetch_and_save_assets(&game.id, &game.title).await;
            metadata.hero_path = asset_paths.hero;
            metadata.grid_path = asset_paths.grid;
            metadata.logo_path = asset_paths.logo;
            metadata.icon_path = asset_paths.icon;
        }
        
        Ok(metadata)
    }
    
    /// Fetch IGDB metadata
    async fn fetch_igdb_metadata(&self, title: &str) -> Option<crate::services::igdb::IGDBMetadata> {
        let mut igdb = self.igdb.lock().await;
        
        if let Some(ref mut service) = *igdb {
            match service.fetch_metadata(title).await {
                Ok(Some(metadata)) => {
                    log::debug!("IGDB found: {} (ID: {})", metadata.name, metadata.igdb_id);
                    return Some(metadata);
                }
                Ok(None) => {
                    log::debug!("IGDB: Game not found: {}", title);
                }
                Err(e) => {
                    log::warn!("IGDB fetch failed for {}: {}", title, e);
                }
            }
        }
        
        None
    }
    
    /// Fetch HLTB durations
    async fn fetch_hltb_durations(&self, title: &str) -> Option<crate::services::howlongtobeat::HLTBDurations> {
        match self.hltb.get_durations(title).await {
            Ok(Some(durations)) => {
                log::debug!("HLTB found durations for {}: main={:?}h", title, durations.main_story);
                Some(durations)
            }
            Ok(None) => {
                log::debug!("HLTB: Game not found: {}", title);
                None
            }
            Err(e) => {
                log::warn!("HLTB fetch failed for {}: {}", title, e);
                None
            }
        }
    }
    
    /// Fetch ProtonDB compatibility
    async fn fetch_protondb_compat(&self, steam_app_id: u32) -> Option<crate::services::protondb::ProtonDBCompatibility> {
        match self.protondb.get_compatibility(steam_app_id).await {
            Ok(Some(compat)) => {
                log::debug!("ProtonDB: {} tier for app {}", compat.tier.as_deref().unwrap_or("unknown"), steam_app_id);
                Some(compat)
            }
            Ok(None) => {
                log::debug!("ProtonDB: No reports for app {}", steam_app_id);
                None
            }
            Err(e) => {
                log::warn!("ProtonDB fetch failed for {}: {}", steam_app_id, e);
                None
            }
        }
    }
    
    /// Fetch Steam achievements
    async fn fetch_steam_achievements(&self, steam_app_id: u32) -> Option<crate::services::achievements::GameAchievements> {
        match self.achievements.get_steam_achievements(steam_app_id).await {
            Ok(Some(achievements)) => {
                log::debug!("Steam achievements: {}/{} for app {}", 
                    achievements.unlocked, achievements.total, steam_app_id);
                Some(achievements)
            }
            Ok(None) => {
                log::debug!("No Steam achievements for app {}", steam_app_id);
                None
            }
            Err(e) => {
                log::warn!("Steam achievements fetch failed for {}: {}", steam_app_id, e);
                None
            }
        }
    }
    
    /// Fetch and save visual assets
    async fn fetch_and_save_assets(&self, game_id: &str, title: &str) -> AssetPaths {
        let mut paths = AssetPaths::default();
        
        let Some(ref steamgriddb) = self.steamgriddb else {
            return paths;
        };
        
        // Check if assets already exist
        let hero_exists = self.cache.has_asset(game_id, AssetType::Hero).await;
        let grid_exists = self.cache.has_asset(game_id, AssetType::Grid).await;
        let logo_exists = self.cache.has_asset(game_id, AssetType::Logo).await;
        let icon_exists = self.cache.has_asset(game_id, AssetType::Icon).await;
        
        // Get existing paths
        if hero_exists {
            paths.hero = self.cache.get_existing_asset_path(game_id, AssetType::Hero).await
                .map(|p| p.to_string_lossy().to_string());
        }
        if grid_exists {
            paths.grid = self.cache.get_existing_asset_path(game_id, AssetType::Grid).await
                .map(|p| p.to_string_lossy().to_string());
        }
        if logo_exists {
            paths.logo = self.cache.get_existing_asset_path(game_id, AssetType::Logo).await
                .map(|p| p.to_string_lossy().to_string());
        }
        if icon_exists {
            paths.icon = self.cache.get_existing_asset_path(game_id, AssetType::Icon).await
                .map(|p| p.to_string_lossy().to_string());
        }
        
        // If all assets exist, return early
        if hero_exists && grid_exists && logo_exists && icon_exists {
            log::debug!("All assets exist for {}", title);
            return paths;
        }
        
        // Fetch assets from SteamGridDB
        log::info!("Fetching assets for: {}", title);
        
        let assets = match steamgriddb.fetch_all_assets(title).await {
            Ok(assets) => assets,
            Err(e) => {
                log::warn!("Failed to fetch assets for {}: {}", title, e);
                return paths;
            }
        };
        
        // Download and save each asset type
        if !hero_exists {
            if let Some(hero) = assets.hero {
                if let Ok(path) = self.download_and_save_asset(steamgriddb, game_id, &hero.url, AssetType::Hero).await {
                    paths.hero = Some(path);
                }
            }
        }
        
        if !grid_exists {
            if let Some(grid) = assets.grid {
                if let Ok(path) = self.download_and_save_asset(steamgriddb, game_id, &grid.url, AssetType::Grid).await {
                    paths.grid = Some(path);
                }
            }
        }
        
        if !logo_exists {
            if let Some(logo) = assets.logo {
                if let Ok(path) = self.download_and_save_asset(steamgriddb, game_id, &logo.url, AssetType::Logo).await {
                    paths.logo = Some(path);
                }
            }
        }
        
        if !icon_exists {
            if let Some(icon) = assets.icon {
                if let Ok(path) = self.download_and_save_asset(steamgriddb, game_id, &icon.url, AssetType::Icon).await {
                    paths.icon = Some(path);
                }
            }
        }
        
        paths
    }
    
    /// Download an image and save it to cache
    async fn download_and_save_asset(
        &self, 
        steamgriddb: &SteamGridDBService,
        game_id: &str, 
        url: &str, 
        asset_type: AssetType
    ) -> Result<String> {
        let (bytes, extension) = steamgriddb.download_image(url).await
            .context("Failed to download image")?;
        
        let path = self.cache.save_asset(game_id, asset_type, &bytes, &extension).await
            .context("Failed to save asset")?;
        
        Ok(path.to_string_lossy().to_string())
    }
    
    /// Build an enriched game from base game and metadata
    async fn build_enriched_game(&self, game: &Game, metadata: &GameMetadata) -> EnrichedGame {
        EnrichedGame {
            // Base info
            id: game.id.clone(),
            title: game.title.clone(),
            store: game.store.clone(),
            store_id: game.store_id.clone(),
            installed: game.installed,
            install_path: game.install_path.clone(),
            wine_prefix: game.wine_prefix.clone(),
            wine_version: game.wine_version.clone(),
            
            // Metadata from IGDB
            description: metadata.description.clone(),
            metacritic_score: metadata.metacritic_score,
            igdb_rating: metadata.igdb_rating,
            developer: metadata.developer.clone().or_else(|| game.developer.clone()),
            publisher: metadata.publisher.clone().or_else(|| game.publisher.clone()),
            genres: metadata.genres.clone(),
            release_date: metadata.release_date.clone().or_else(|| game.release_date.clone()),
            summary: metadata.summary.clone(),
            
            // Playtime from HLTB
            hltb_main: metadata.hltb_main,
            hltb_main_extra: metadata.hltb_main_extra,
            hltb_complete: metadata.hltb_complete,
            hltb_speedrun: metadata.hltb_speedrun,
            
            // Compatibility from ProtonDB
            proton_tier: metadata.proton_tier.clone(),
            proton_confidence: metadata.proton_confidence.clone(),
            proton_trending_tier: metadata.proton_trending_tier.clone(),
            steam_app_id: metadata.steam_app_id,
            
            // Achievements
            achievements_total: metadata.achievements_total,
            achievements_unlocked: metadata.achievements_unlocked,
            
            // Assets (local paths)
            hero_path: metadata.hero_path.clone(),
            grid_path: metadata.grid_path.clone(),
            logo_path: metadata.logo_path.clone(),
            icon_path: metadata.icon_path.clone(),
            
            // Legacy URLs
            cover_url: game.cover_url.clone(),
            background_url: game.background_url.clone(),
            
            // User data
            play_time_minutes: game.play_time_minutes,
            last_played: game.last_played,
            
            // Timestamps
            created_at: game.created_at,
            updated_at: game.updated_at,
            enriched_at: Some(metadata.last_updated),
        }
    }
    
    /// Enrich multiple games (with parallelization)
    pub async fn enrich_games(&self, games: &[Game]) -> Vec<EnrichedGame> {
        let mut enriched = Vec::with_capacity(games.len());
        
        // Process games sequentially to avoid rate limiting
        // TODO: Could use semaphore for controlled parallelism
        for game in games {
            match self.enrich_game(game).await {
                Ok(eg) => enriched.push(eg),
                Err(e) => {
                    log::error!("Failed to enrich {}: {}", game.title, e);
                    // Add a minimally enriched version
                    enriched.push(self.build_minimal_enriched(game));
                }
            }
        }
        
        enriched
    }
    
    /// Build a minimal enriched game (when enrichment fails)
    fn build_minimal_enriched(&self, game: &Game) -> EnrichedGame {
        EnrichedGame {
            id: game.id.clone(),
            title: game.title.clone(),
            store: game.store.clone(),
            store_id: game.store_id.clone(),
            installed: game.installed,
            install_path: game.install_path.clone(),
            wine_prefix: game.wine_prefix.clone(),
            wine_version: game.wine_version.clone(),
            
            description: game.description.clone(),
            metacritic_score: None,
            igdb_rating: None,
            developer: game.developer.clone(),
            publisher: game.publisher.clone(),
            genres: vec![],
            release_date: game.release_date.clone(),
            summary: None,
            
            hltb_main: None,
            hltb_main_extra: None,
            hltb_complete: None,
            hltb_speedrun: None,
            
            proton_tier: None,
            proton_confidence: None,
            proton_trending_tier: None,
            steam_app_id: None,
            
            achievements_total: None,
            achievements_unlocked: None,
            
            hero_path: None,
            grid_path: None,
            logo_path: None,
            icon_path: None,
            
            cover_url: game.cover_url.clone(),
            background_url: game.background_url.clone(),
            
            play_time_minutes: game.play_time_minutes,
            last_played: game.last_played,
            
            created_at: game.created_at,
            updated_at: game.updated_at,
            enriched_at: None,
        }
    }
    
    /// Clear cache for a specific game
    pub async fn clear_game_cache(&self, game_id: &str) -> Result<()> {
        self.cache.clear_game_cache(game_id).await
    }
    
    /// Clear all cache
    pub async fn clear_all_cache(&self) -> Result<()> {
        self.cache.clear_all().await
    }
    
    /// Get cache statistics
    pub async fn get_cache_stats(&self) -> Result<crate::services::cache_manager::CacheStats> {
        self.cache.get_stats().await
    }
}

/// Asset paths collection
#[derive(Debug, Default)]
struct AssetPaths {
    hero: Option<String>,
    grid: Option<String>,
    logo: Option<String>,
    icon: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_enricher_config_default() {
        let config = EnricherConfig::default();
        assert_eq!(config.cache_max_age_days, 30);
        assert!(config.fetch_assets);
        assert!(config.fetch_hltb);
        assert!(config.fetch_protondb);
        assert!(config.fetch_achievements);
    }
}
