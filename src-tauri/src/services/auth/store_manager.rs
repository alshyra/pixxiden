use super::{AmazonAuth, EpicAuth, GOGAuthService};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Store {
    Epic,
    GOG,
    Amazon,
    Steam,
}

impl Store {
    pub fn as_str(&self) -> &str {
        match self {
            Store::Epic => "epic",
            Store::GOG => "gog",
            Store::Amazon => "amazon",
            Store::Steam => "steam",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ConfigSource {
    Pixxiden, // Config created by PixiDen
    Heroic,   // Existing config from Heroic
    None,     // No config
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub username: Option<String>,
    pub config_source: ConfigSource,
}

pub struct StoreManager {
    epic_auth: EpicAuth,
    gog_auth: GOGAuthService,
    amazon_auth: AmazonAuth,
}

impl StoreManager {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            epic_auth: EpicAuth::new(app_handle.clone()),
            gog_auth: GOGAuthService::new(app_handle.clone()),
            amazon_auth: AmazonAuth::new(app_handle.clone()),
        }
    }

    /// Get authentication status for all stores
    pub async fn get_all_auth_status(&self) -> HashMap<String, AuthStatus> {
        let mut status_map = HashMap::new();

        // Epic Games
        let epic_authenticated = self.epic_auth.is_authenticated().await;
        status_map.insert(
            Store::Epic.as_str().to_string(),
            AuthStatus {
                authenticated: epic_authenticated,
                username: if epic_authenticated {
                    self.epic_auth.get_username().await
                } else {
                    None
                },
                config_source: if epic_authenticated {
                    ConfigSource::Heroic // Legendary uses same path as Heroic
                } else {
                    ConfigSource::None
                },
            },
        );

        // GOG
        let gog_authenticated = self.gog_auth.is_authenticated().await;
        status_map.insert(
            Store::GOG.as_str().to_string(),
            AuthStatus {
                authenticated: gog_authenticated,
                username: None, // GOG auth doesn't expose username easily
                config_source: if gog_authenticated {
                    ConfigSource::Heroic
                } else {
                    ConfigSource::None
                },
            },
        );

        // Amazon Games
        let amazon_authenticated = self.amazon_auth.is_authenticated().await;
        status_map.insert(
            Store::Amazon.as_str().to_string(),
            AuthStatus {
                authenticated: amazon_authenticated,
                username: if amazon_authenticated {
                    self.amazon_auth.get_username().await
                } else {
                    None
                },
                config_source: if amazon_authenticated {
                    ConfigSource::Heroic // Nile uses same path as Heroic
                } else {
                    ConfigSource::None
                },
            },
        );

        // Steam (read-only detection)
        status_map.insert(
            Store::Steam.as_str().to_string(),
            AuthStatus {
                authenticated: self.detect_steam(),
                username: None,
                config_source: ConfigSource::None,
            },
        );

        status_map
    }

    /// Detect if Steam is installed locally
    fn detect_steam(&self) -> bool {
        // Check common Steam installation paths
        let steam_paths = vec![
            dirs::home_dir().map(|p| p.join(".steam")),
            dirs::home_dir().map(|p| p.join(".local/share/Steam")),
        ];

        steam_paths.iter().any(|path| {
            if let Some(p) = path {
                p.exists()
            } else {
                false
            }
        })
    }

    /// Get Epic auth service reference
    pub fn epic(&self) -> &EpicAuth {
        &self.epic_auth
    }

    /// Get GOG auth service reference
    pub fn gog(&self) -> &GOGAuthService {
        &self.gog_auth
    }

    /// Get Amazon auth service reference
    pub fn amazon(&self) -> &AmazonAuth {
        &self.amazon_auth
    }
}
