//! Steam store adapter
//! Detects Steam installation and reads library data

use std::path::PathBuf;
use anyhow::Result;
use serde::Deserialize;
use chrono::Utc;
use crate::database::Game;

/// Steam adapter for detecting Steam installation and reading library
pub struct SteamAdapter {
    /// Path to Steam installation directory
    pub steam_path: Option<PathBuf>,
    /// Path to Steam library folders
    pub library_folders: Vec<PathBuf>,
}

#[derive(Debug, Deserialize)]
struct LibraryFoldersVdf {
    #[serde(rename = "libraryfolders")]
    library_folders: std::collections::HashMap<String, LibraryFolder>,
}

#[derive(Debug, Deserialize)]
struct LibraryFolder {
    path: String,
    #[serde(default)]
    apps: std::collections::HashMap<String, String>,
}

impl SteamAdapter {
    pub fn new() -> Self {
        let steam_path = Self::find_steam_path();
        let library_folders = if let Some(ref path) = steam_path {
            Self::find_library_folders(path).unwrap_or_default()
        } else {
            vec![]
        };
        
        log::info!("Steam path: {:?}", steam_path);
        log::info!("Steam library folders: {:?}", library_folders);
        
        Self {
            steam_path,
            library_folders,
        }
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
    
    /// Find all Steam library folders
    fn find_library_folders(steam_path: &PathBuf) -> Result<Vec<PathBuf>> {
        let vdf_path = steam_path.join("steamapps/libraryfolders.vdf");
        let mut folders = vec![];
        
        // Always include the main steamapps folder
        let main_steamapps = steam_path.join("steamapps");
        if main_steamapps.exists() {
            folders.push(main_steamapps);
        }
        
        // Parse libraryfolders.vdf for additional library locations
        if vdf_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&vdf_path) {
                // Simple VDF parsing for paths
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("\"path\"") {
                        // Extract path value: "path"		"/path/to/library"
                        if let Some(start) = trimmed.rfind('"') {
                            let before_quote = &trimmed[..start];
                            if let Some(path_start) = before_quote.rfind('"') {
                                let path_str = &before_quote[path_start + 1..];
                                let lib_path = PathBuf::from(path_str).join("steamapps");
                                if lib_path.exists() && !folders.contains(&lib_path) {
                                    folders.push(lib_path);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(folders)
    }
    
    /// Get list of installed Steam games
    pub async fn get_installed_games(&self) -> Result<Vec<Game>> {
        let mut games = vec![];
        
        for library_path in &self.library_folders {
            // Read appmanifest files
            if let Ok(entries) = std::fs::read_dir(library_path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if name.starts_with("appmanifest_") && name.ends_with(".acf") {
                            if let Ok(game) = self.parse_app_manifest(&path).await {
                                games.push(game);
                            }
                        }
                    }
                }
            }
        }
        
        log::info!("Found {} installed Steam games", games.len());
        Ok(games)
    }
    
    /// Parse a Steam appmanifest file
    async fn parse_app_manifest(&self, path: &PathBuf) -> Result<Game> {
        let content = std::fs::read_to_string(path)?;
        
        let mut app_id = String::new();
        let mut name = String::new();
        let mut install_dir = String::new();
        
        // Simple ACF/VDF parsing
        for line in content.lines() {
            let trimmed = line.trim();
            
            if trimmed.starts_with("\"appid\"") {
                app_id = self.extract_vdf_value(trimmed);
            } else if trimmed.starts_with("\"name\"") {
                name = self.extract_vdf_value(trimmed);
            } else if trimmed.starts_with("\"installdir\"") {
                install_dir = self.extract_vdf_value(trimmed);
            }
        }
        
        if app_id.is_empty() || name.is_empty() {
            anyhow::bail!("Invalid appmanifest: missing appid or name");
        }
        
        // Find the actual install path
        let parent = path.parent().unwrap_or(path);
        let install_path = parent.join("common").join(&install_dir);
        let now = Utc::now();
        
        Ok(Game {
            id: format!("steam_{}", app_id),
            title: name,
            store: "steam".to_string(),
            store_id: app_id.clone(),
            installed: true,
            install_path: Some(install_path.to_string_lossy().to_string()),
            custom_executable: None,
            wine_prefix: None,
            wine_version: None,
            cover_url: Some(format!("https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900.jpg", app_id)),
            background_url: Some(format!("https://steamcdn-a.akamaihd.net/steam/apps/{}/library_hero.jpg", app_id)),
            developer: None,
            publisher: None,
            description: None,
            release_date: None,
            last_played: None,
            play_time_minutes: 0,
            created_at: now,
            updated_at: now,
        })
    }
    
    /// Extract value from VDF line like "key"		"value"
    fn extract_vdf_value(&self, line: &str) -> String {
        // Find the last quoted value
        let mut in_quotes = false;
        let mut value_start = 0;
        let mut last_quote_end = 0;
        let chars: Vec<char> = line.chars().collect();
        
        for (i, &c) in chars.iter().enumerate() {
            if c == '"' {
                if in_quotes {
                    last_quote_end = i;
                    in_quotes = false;
                } else {
                    value_start = i + 1;
                    in_quotes = true;
                }
            }
        }
        
        if value_start < last_quote_end {
            return line[value_start..last_quote_end].to_string();
        }
        
        String::new()
    }
}

impl Default for SteamAdapter {
    fn default() -> Self {
        Self::new()
    }
}
