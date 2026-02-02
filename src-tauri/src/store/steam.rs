//! Steam store adapter
//! Detects Steam installation and reads library data

use std::path::PathBuf;

/// Steam adapter for detecting Steam installation and reading library
pub struct SteamAdapter {
    /// Path to Steam installation directory
    pub steam_path: Option<PathBuf>,
}

// TODO: VDF parsing and library folder detection migrated to SteamService.ts
// This adapter now only keeps steam_path detection for backward compatibility

impl SteamAdapter {
    pub fn new() -> Self {
        let steam_path = Self::find_steam_path();
        log::info!("Steam path: {:?}", steam_path);

        Self { steam_path }
    }

    /// Check if Steam is installed
    pub fn is_available(&self) -> bool {
        self.steam_path.is_some()
    }

    /// Check if user is logged in (Steam stores credentials locally)
    pub async fn is_authenticated(&self) -> bool {
        // Steam is considered "authenticated" if it's installed and has a loginusers.vdf
        if let Some(ref path) = self.steam_path {
            let loginusers = path.join("config/loginusers.vdf");
            if loginusers.exists() {
                // Check if there's at least one user entry
                if let Ok(content) = std::fs::read_to_string(&loginusers) {
                    return content.contains("AccountName");
                }
            }
        }
        false
    }

    /// Get the Steam username if authenticated
    pub async fn get_username(&self) -> Option<String> {
        if let Some(ref path) = self.steam_path {
            let loginusers = path.join("config/loginusers.vdf");
            if let Ok(content) = std::fs::read_to_string(&loginusers) {
                // Simple VDF parsing - look for "AccountName" value
                for line in content.lines() {
                    if line.contains("AccountName") {
                        // Extract the value between quotes
                        if let Some(start) = line.rfind('"') {
                            let before_quote = &line[..start];
                            if let Some(name_start) = before_quote.rfind('"') {
                                let name = &before_quote[name_start + 1..];
                                if !name.is_empty() {
                                    return Some(name.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    }

    /// Find Steam installation path
    fn find_steam_path() -> Option<PathBuf> {
        // Standard Linux Steam paths
        let paths = [
            dirs::home_dir().map(|h| h.join(".steam/steam")),
            dirs::home_dir().map(|h| h.join(".local/share/Steam")),
            Some(PathBuf::from("/usr/share/steam")),
        ];

        for path_opt in paths.iter() {
            if let Some(path) = path_opt {
                if path.exists() && path.join("steamapps").exists() {
                    return Some(path.clone());
                }
            }
        }

        // Check via symlink resolution
        if let Some(home) = dirs::home_dir() {
            let steam_link = home.join(".steam/steam");
            if let Ok(resolved) = std::fs::read_link(&steam_link) {
                if resolved.exists() {
                    return Some(resolved);
                }
            }
        }

        None
    }

    // TODO: The following methods were migrated to SteamService.ts:
    // - find_library_folders() - VDF parsing for library detection
    // - get_installed_games() - ACF parsing for installed game detection
    // - parse_app_manifest() - Full appmanifest parsing
    // - extract_vdf_value() - VDF value extraction
    // Only binary detection and authentication check remain in Rust
}

impl Default for SteamAdapter {
    fn default() -> Self {
        Self::new()
    }
}
