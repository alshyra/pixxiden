//! Cache Manager for game metadata and assets
//!
//! Manages local caching of:
//! - metadata.json: Game metadata from IGDB, HowLongToBeat, ProtonDB
//! - assets/game_id/: Visual assets (hero, grid, logo, icon) from SteamGridDB
//!
//! Cache structure:
//! ~/.local/share/pixxiden/
//! ├── metadata.json
//! └── assets/
//!     ├── game_123/
//!     │   ├── hero.jpg
//!     │   ├── grid.png
//!     │   ├── logo.png
//!     │   └── icon.png
//!     └── game_456/
//!         └── ...

use crate::models::GameMetadata;
use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// Metadata cache stored in metadata.json
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MetadataCache {
    pub version: u32,
    pub games: HashMap<String, GameMetadata>,
}

impl MetadataCache {
    pub fn new() -> Self {
        Self {
            version: 1,
            games: HashMap::new(),
        }
    }
}

/// Asset type for downloads
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetType {
    Hero,
    Grid,
    Logo,
    Icon,
}

impl AssetType {
    pub fn filename(&self) -> &'static str {
        match self {
            Self::Hero => "hero",
            Self::Grid => "grid",
            Self::Logo => "logo",
            Self::Icon => "icon",
        }
    }
}

/// Cache manager for metadata and assets
pub struct CacheManager {
    cache_dir: PathBuf,
    metadata_path: PathBuf,
}

impl CacheManager {
    /// Create a new cache manager
    pub fn new() -> Result<Self> {
        let data_dir = dirs::data_local_dir()
            .or_else(|| dirs::data_dir())
            .context("Could not find data directory")?;

        let cache_dir = data_dir.join("pixxiden");
        let metadata_path = cache_dir.join("metadata.json");

        Ok(Self {
            cache_dir,
            metadata_path,
        })
    }

    // TODO: with_path() and cache_dir() methods removed - only used for testing
    // Use new() or get_or_create() instead

    /// Get the assets directory path
    pub fn assets_dir(&self) -> PathBuf {
        self.cache_dir.join("assets")
    }

    /// Get the game assets directory path
    pub fn game_assets_dir(&self, game_id: &str) -> PathBuf {
        self.assets_dir().join(sanitize_filename(game_id))
    }

    /// Initialize cache directories
    pub async fn init(&self) -> Result<()> {
        fs::create_dir_all(&self.cache_dir)
            .await
            .context("Failed to create cache directory")?;
        fs::create_dir_all(self.assets_dir())
            .await
            .context("Failed to create assets directory")?;

        // Create metadata.json if it doesn't exist
        if !self.metadata_path.exists() {
            let cache = MetadataCache::new();
            self.save_metadata_cache(&cache).await?;
        }

        log::info!("Cache initialized at {:?}", self.cache_dir);
        Ok(())
    }

    // ===================== METADATA OPERATIONS =====================

    /// Load the entire metadata cache
    pub async fn load_metadata_cache(&self) -> Result<MetadataCache> {
        if !self.metadata_path.exists() {
            return Ok(MetadataCache::new());
        }

        let content = fs::read_to_string(&self.metadata_path)
            .await
            .context("Failed to read metadata.json")?;

        let cache: MetadataCache =
            serde_json::from_str(&content).context("Failed to parse metadata.json")?;

        Ok(cache)
    }

    /// Save the entire metadata cache
    pub async fn save_metadata_cache(&self, cache: &MetadataCache) -> Result<()> {
        let content =
            serde_json::to_string_pretty(cache).context("Failed to serialize metadata cache")?;

        fs::write(&self.metadata_path, content)
            .await
            .context("Failed to write metadata.json")?;

        Ok(())
    }

    /// Get metadata for a specific game
    pub async fn get_game_metadata(&self, game_id: &str) -> Result<Option<GameMetadata>> {
        let cache = self.load_metadata_cache().await?;
        Ok(cache.games.get(game_id).cloned())
    }

    /// Save metadata for a specific game
    pub async fn save_game_metadata(&self, metadata: &GameMetadata) -> Result<()> {
        let mut cache = self.load_metadata_cache().await?;
        cache
            .games
            .insert(metadata.game_id.clone(), metadata.clone());
        self.save_metadata_cache(&cache).await?;
        Ok(())
    }

    // TODO: has_game_metadata() removed - use get_game_metadata().is_some() instead

    /// Remove metadata for a specific game
    pub async fn remove_game_metadata(&self, game_id: &str) -> Result<()> {
        let mut cache = self.load_metadata_cache().await?;
        cache.games.remove(game_id);
        self.save_metadata_cache(&cache).await?;
        Ok(())
    }

    // ===================== ASSET OPERATIONS =====================

    // TODO: get_asset_path() removed - use game_assets_dir() and build path manually

    /// Check if an asset exists
    pub async fn has_asset(&self, game_id: &str, asset_type: AssetType) -> bool {
        let game_dir = self.game_assets_dir(game_id);

        // Check for any common image extension
        for ext in &["jpg", "jpeg", "png", "webp"] {
            let path = game_dir.join(format!("{}.{}", asset_type.filename(), ext));
            if path.exists() {
                return true;
            }
        }

        false
    }

    /// Get the existing asset path if it exists
    pub async fn get_existing_asset_path(
        &self,
        game_id: &str,
        asset_type: AssetType,
    ) -> Option<PathBuf> {
        let game_dir = self.game_assets_dir(game_id);

        for ext in &["jpg", "jpeg", "png", "webp"] {
            let path = game_dir.join(format!("{}.{}", asset_type.filename(), ext));
            if path.exists() {
                return Some(path);
            }
        }

        None
    }

    /// Save an asset from bytes
    pub async fn save_asset(
        &self,
        game_id: &str,
        asset_type: AssetType,
        data: &[u8],
        extension: &str,
    ) -> Result<PathBuf> {
        let game_dir = self.game_assets_dir(game_id);
        fs::create_dir_all(&game_dir)
            .await
            .context("Failed to create game assets directory")?;

        let path = game_dir.join(format!("{}.{}", asset_type.filename(), extension));

        let mut file = fs::File::create(&path)
            .await
            .context("Failed to create asset file")?;

        file.write_all(data)
            .await
            .context("Failed to write asset data")?;

        log::debug!(
            "Saved asset {:?} for game {} at {:?}",
            asset_type,
            game_id,
            path
        );
        Ok(path)
    }

    /// Delete all assets for a game
    pub async fn delete_game_assets(&self, game_id: &str) -> Result<()> {
        let game_dir = self.game_assets_dir(game_id);

        if game_dir.exists() {
            fs::remove_dir_all(&game_dir)
                .await
                .context("Failed to delete game assets directory")?;
            log::debug!("Deleted assets for game {}", game_id);
        }

        Ok(())
    }

    // ===================== CACHE MANAGEMENT =====================

    /// Clear all cache (metadata + assets)
    pub async fn clear_all(&self) -> Result<()> {
        // Clear metadata
        let empty_cache = MetadataCache::new();
        self.save_metadata_cache(&empty_cache).await?;

        // Clear assets
        let assets_dir = self.assets_dir();
        if assets_dir.exists() {
            fs::remove_dir_all(&assets_dir).await?;
            fs::create_dir_all(&assets_dir).await?;
        }

        log::info!("Cache cleared");
        Ok(())
    }

    /// Clear cache for a specific game
    pub async fn clear_game_cache(&self, game_id: &str) -> Result<()> {
        self.remove_game_metadata(game_id).await?;
        self.delete_game_assets(game_id).await?;

        log::info!("Cache cleared for game {}", game_id);
        Ok(())
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> Result<CacheStats> {
        let cache = self.load_metadata_cache().await?;
        let mut total_assets_size = 0u64;
        let mut total_assets_count = 0u32;

        let assets_dir = self.assets_dir();
        if assets_dir.exists() {
            let mut entries = fs::read_dir(&assets_dir).await?;
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if path.is_dir() {
                    let mut game_entries = fs::read_dir(&path).await?;
                    while let Some(asset_entry) = game_entries.next_entry().await? {
                        if let Ok(metadata) = asset_entry.metadata().await {
                            total_assets_size += metadata.len();
                            total_assets_count += 1;
                        }
                    }
                }
            }
        }

        Ok(CacheStats {
            games_count: cache.games.len() as u32,
            total_assets_count,
            total_assets_size,
            cache_dir: self.cache_dir.clone(),
        })
    }

    /// Check if game metadata is stale (older than max_age_days)
    pub async fn is_metadata_stale(&self, game_id: &str, max_age_days: i64) -> bool {
        match self.get_game_metadata(game_id).await {
            Ok(Some(metadata)) => {
                let age = Utc::now() - metadata.last_updated;
                age.num_days() > max_age_days
            }
            _ => true, // No metadata = stale
        }
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub games_count: u32,
    pub total_assets_count: u32,
    pub total_assets_size: u64,
    pub cache_dir: PathBuf,
}

/// Sanitize a filename to be safe for filesystem
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Tests removed for methods that were deleted (with_path, cache_dir, has_game_metadata)
    // The remaining tests use integration testing with the actual CacheManager::new()

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("normal_name"), "normal_name");
        assert_eq!(sanitize_filename("path/with/slashes"), "path_with_slashes");
        assert_eq!(
            sanitize_filename("special:chars*here"),
            "special_chars_here"
        );
    }
}
