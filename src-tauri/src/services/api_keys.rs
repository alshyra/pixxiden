//! API Keys Configuration Service
//!
//! Manages user-provided API keys stored in a local config file.
//! Keys are stored in JSON format in the app's config directory.
//!
//! Supported API keys:
//! - SteamGridDB API Key
//! - IGDB/Twitch Client ID and Secret
//! - Steam Web API Key

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const CONFIG_FILENAME: &str = "api_keys.json";

/// API Keys configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ApiKeysConfig {
    /// SteamGridDB API key for game artwork
    #[serde(default)]
    pub steamgriddb_api_key: Option<String>,

    /// IGDB/Twitch Client ID for game metadata
    #[serde(default)]
    pub igdb_client_id: Option<String>,

    /// IGDB/Twitch Client Secret for game metadata
    #[serde(default)]
    pub igdb_client_secret: Option<String>,

    /// Steam Web API key for achievements
    #[serde(default)]
    pub steam_api_key: Option<String>,

    /// Steam user ID (64-bit SteamID)
    #[serde(default)]
    pub steam_id: Option<String>,

    /// Whether the initial setup has been completed
    #[serde(default)]
    pub setup_completed: bool,
}

impl ApiKeysConfig {
    /// Check if IGDB credentials are configured
    pub fn has_igdb(&self) -> bool {
        self.igdb_client_id
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
            && self
                .igdb_client_secret
                .as_ref()
                .map(|s| !s.is_empty())
                .unwrap_or(false)
    }

    /// Check if SteamGridDB is configured
    pub fn has_steamgriddb(&self) -> bool {
        self.steamgriddb_api_key
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
    }

    /// Check if Steam API is configured
    pub fn has_steam(&self) -> bool {
        self.steam_api_key
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
            && self
                .steam_id
                .as_ref()
                .map(|s| !s.is_empty())
                .unwrap_or(false)
    }
}

/// API Keys Manager
pub struct ApiKeysManager {
    config_path: PathBuf,
}

impl ApiKeysManager {
    /// Create a new API keys manager
    pub fn new() -> Result<Self> {
        let config_dir = Self::get_config_dir()?;
        let config_path = config_dir.join(CONFIG_FILENAME);

        Ok(Self { config_path })
    }

    /// Get the config directory path
    fn get_config_dir() -> Result<PathBuf> {
        // Use tauri's app config dir if available, otherwise fallback
        let base_dir = dirs::config_dir().context("Could not determine config directory")?;

        let config_dir = base_dir.join("pixxiden");

        // Create directory if it doesn't exist
        if !config_dir.exists() {
            std::fs::create_dir_all(&config_dir).context("Failed to create config directory")?;
        }

        Ok(config_dir)
    }

    /// Load API keys config from file
    pub fn load(&self) -> Result<ApiKeysConfig> {
        if !self.config_path.exists() {
            log::info!("API keys config file not found, using defaults");
            return Ok(ApiKeysConfig::default());
        }

        let content = std::fs::read_to_string(&self.config_path)
            .context("Failed to read API keys config file")?;

        let config: ApiKeysConfig =
            serde_json::from_str(&content).context("Failed to parse API keys config file")?;

        log::info!("Loaded API keys config from {:?}", self.config_path);
        log::info!(
            "  - SteamGridDB: {}",
            if config.has_steamgriddb() {
                "configured"
            } else {
                "not set"
            }
        );
        log::info!(
            "  - IGDB: {}",
            if config.has_igdb() {
                "configured"
            } else {
                "not set"
            }
        );
        log::info!(
            "  - Steam: {}",
            if config.has_steam() {
                "configured"
            } else {
                "not set"
            }
        );

        Ok(config)
    }

    /// Save API keys config to file
    pub fn save(&self, config: &ApiKeysConfig) -> Result<()> {
        let content =
            serde_json::to_string_pretty(config).context("Failed to serialize API keys config")?;

        std::fs::write(&self.config_path, content)
            .context("Failed to write API keys config file")?;

        log::info!("Saved API keys config to {:?}", self.config_path);
        Ok(())
    }

    /// Check if setup has been completed
    pub fn is_setup_completed(&self) -> bool {
        self.load().map(|c| c.setup_completed).unwrap_or(false)
    }

    /// Mark setup as completed
    pub fn mark_setup_completed(&self) -> Result<()> {
        let mut config = self.load().unwrap_or_default();
        config.setup_completed = true;
        self.save(&config)
    }
}

impl Default for ApiKeysManager {
    fn default() -> Self {
        Self::new().expect("Failed to create API keys manager")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_manager() -> (ApiKeysManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join(CONFIG_FILENAME);
        let manager = ApiKeysManager { config_path };
        (manager, temp_dir)
    }

    #[test]
    fn test_default_config() {
        let config = ApiKeysConfig::default();
        assert!(!config.has_igdb());
        assert!(!config.has_steamgriddb());
        assert!(!config.has_steam());
        assert!(!config.setup_completed);
    }

    #[test]
    fn test_has_igdb() {
        let mut config = ApiKeysConfig::default();
        assert!(!config.has_igdb());

        config.igdb_client_id = Some("client_id".to_string());
        assert!(!config.has_igdb());

        config.igdb_client_secret = Some("secret".to_string());
        assert!(config.has_igdb());

        // Empty strings should not count
        config.igdb_client_id = Some("".to_string());
        assert!(!config.has_igdb());
    }

    #[test]
    fn test_save_and_load() {
        let (manager, _temp) = create_test_manager();

        let mut config = ApiKeysConfig::default();
        config.steamgriddb_api_key = Some("test_key".to_string());
        config.setup_completed = true;

        manager.save(&config).unwrap();

        let loaded = manager.load().unwrap();
        assert_eq!(loaded.steamgriddb_api_key, Some("test_key".to_string()));
        assert!(loaded.setup_completed);
    }

    #[test]
    fn test_load_missing_file() {
        let (manager, _temp) = create_test_manager();

        let config = manager.load().unwrap();
        assert!(!config.setup_completed);
    }
}
