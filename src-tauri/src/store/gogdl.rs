use crate::database::Game;
use crate::store::StoreAdapter;
use crate::commands::InstallProgressEvent;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{Window, Emitter};

/// GOGDL adapter for GOG Galaxy
/// Uses Heroic Launcher's gogdl binary
pub struct GogdlAdapter {
    binary_path: PathBuf,
    config_path: PathBuf,
}

#[derive(Debug, Deserialize)]
struct GogGame {
    #[serde(rename = "appName")]
    app_name: String,
    title: String,
    #[serde(rename = "art_square")]
    art_square: Option<String>,
    #[serde(rename = "art_cover")]
    art_cover: Option<String>,
    developer: Option<String>,
    publisher: Option<String>,
    #[serde(rename = "is_installed")]
    is_installed: Option<bool>,
    install_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InstalledGame {
    #[serde(rename = "appName")]
    app_name: String,
    install_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InstalledGames {
    installed: Vec<InstalledGame>,
}

impl GogdlAdapter {
    pub fn new() -> Self {
        let binary_path = Self::find_binary();
        let config_path = Self::find_config();
        
        log::info!("GOGDL binary: {:?}", binary_path);
        log::info!("GOGDL config: {:?}", config_path);
        
        Self {
            binary_path,
            config_path,
        }
    }
    
    fn find_binary() -> PathBuf {
        // Heroic Launcher bundled binary
        let heroic_path = PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/gogdl");
        if heroic_path.exists() {
            return heroic_path;
        }
        
        // Flatpak Heroic
        let flatpak_path = dirs::home_dir()
            .map(|h| h.join(".var/app/com.heroicgameslauncher.hgl/config/heroic/tools/gogdl/gogdl"))
            .unwrap_or_default();
        if flatpak_path.exists() {
            return flatpak_path;
        }
        
        PathBuf::from("gogdl")
    }
    
    fn find_config() -> PathBuf {
        // Heroic's GOG config
        let heroic_config = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gogdlConfig/heroic_gogdl"))
            .unwrap_or_default();
        if heroic_config.exists() {
            return heroic_config;
        }
        
        dirs::config_dir()
            .map(|c| c.join("gogdl"))
            .unwrap_or_else(|| PathBuf::from("~/.config/gogdl"))
    }
    
    async fn run_command(&self, args: &[&str]) -> anyhow::Result<String> {
        let output = Command::new(&self.binary_path)
            .args(args)
            .env("GOGDL_CONFIG_PATH", &self.config_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("GOGDL command failed: {}", stderr);
        }
        
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
    
    /// Read installed games from Heroic's gog_store/installed.json
    fn read_installed_games(&self) -> HashMap<String, String> {
        let installed_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/installed.json"))
            .unwrap_or_default();
        
        let mut result = HashMap::new();
        
        if let Ok(content) = std::fs::read_to_string(&installed_path) {
            if let Ok(data) = serde_json::from_str::<InstalledGames>(&content) {
                for game in data.installed {
                    if let Some(path) = game.install_path {
                        result.insert(game.app_name, path);
                    }
                }
            }
        }
        
        log::info!("Found {} installed GOG games from Heroic", result.len());
        result
    }
    
    /// Read Heroic's GamesConfig/{store_id}.json to get wine config
    fn read_heroic_game_config(&self, store_id: &str) -> Option<(String, String)> {
        let config_dir = dirs::home_dir()?.join(".config/heroic/GamesConfig");
        let config_path = config_dir.join(format!("{}.json", store_id));
        
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(game_config) = data.get(store_id) {
                    let wine_prefix = game_config.get("winePrefix")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let wine_version = game_config.get("wineVersion")
                        .and_then(|v| v.get("name"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    
                    if let (Some(prefix), Some(version)) = (wine_prefix, wine_version) {
                        return Some((prefix, version));
                    }
                }
            }
        }
        
        None
    }
    
    /// Fallback: list only installed games when library.json is not available
    async fn list_installed_games_only(&self) -> anyhow::Result<Vec<Game>> {
        log::info!("Falling back to installed games only");
        let installed_data = self.read_installed_games();
        
        let now = Utc::now();
        let games: Vec<Game> = installed_data
            .into_iter()
            .map(|(app_name, install_path)| {
                // Try to get title from install path folder name
                let title = std::path::Path::new(&install_path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or(&app_name)
                    .to_string();
                
                let (wine_prefix, wine_version) = self.read_heroic_game_config(&app_name)
                    .unwrap_or((String::new(), String::new()));
                
                Game {
                    id: format!("gog_{}", app_name),
                    title,
                    store: "gog".to_string(),
                    store_id: app_name,
                    installed: true,
                    install_path: Some(install_path),
                    wine_prefix: if wine_prefix.is_empty() { None } else { Some(wine_prefix) },
                    wine_version: if wine_version.is_empty() { None } else { Some(wine_version) },
                    cover_url: None,
                    background_url: None,
                    developer: None,
                    publisher: None,
                    description: None,
                    release_date: None,
                    last_played: None,
                    play_time_minutes: 0,
                    created_at: now,
                    updated_at: now,
                }
            })
            .collect();
        
        log::info!("Found {} installed GOG games (fallback)", games.len());
        Ok(games)
    }
    
    /// Install with progress events (must be outside trait impl)
    pub async fn install_game_with_progress(&self, store_id: &str, window: &Window, game_id: &str) -> anyhow::Result<()> {
        log::info!("Installing GOG game with progress: {}", store_id);
        
        let mut child = Command::new(&self.binary_path)
            .args(["download", store_id])
            .env("GOGDL_CONFIG_PATH", &self.config_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        
        let stderr = child.stderr.take().ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;
        let mut reader = BufReader::new(stderr).lines();
        
        // Parse progress from gogdl output
        while let Some(line) = reader.next_line().await? {
            log::debug!("GOGDL output: {}", line);
            
            if line.contains("progress") || line.contains("Progress") || line.contains("%") {
                if let Some(progress_data) = Self::parse_gogdl_progress(&line) {
                    let event = InstallProgressEvent {
                        game_id: game_id.to_string(),
                        progress: progress_data.0,
                        downloaded: progress_data.1,
                        total: progress_data.2,
                        speed: progress_data.3,
                        eta: progress_data.4,
                    };
                    let _ = window.emit("game-install-progress", &event);
                }
            }
        }
        
        let status = child.wait().await?;
        if !status.success() {
            anyhow::bail!("GOGDL download failed with exit code: {:?}", status.code());
        }
        
        Ok(())
    }
    
    /// Parse gogdl progress line
    fn parse_gogdl_progress(line: &str) -> Option<(f32, String, String, String, String)> {
        let progress: f32 = if let Some(pct_pos) = line.find('%') {
            let before_pct = &line[..pct_pos];
            let num_start = before_pct.rfind(|c: char| !c.is_ascii_digit() && c != '.')
                .map(|p| p + 1)
                .unwrap_or(0);
            before_pct[num_start..].trim().parse().ok()?
        } else {
            return None;
        };
        
        let (downloaded, total) = if let (Some(paren_start), Some(paren_end)) = (line.find('('), line.find(')')) {
            let size_str = &line[paren_start + 1..paren_end];
            if let Some(slash_pos) = size_str.find('/') {
                (size_str[..slash_pos].trim().to_string(), size_str[slash_pos + 1..].trim().to_string())
            } else {
                (format!("{:.1}%", progress), "100%".to_string())
            }
        } else {
            (format!("{:.1}%", progress), "100%".to_string())
        };
        
        let speed = if let Some(at_pos) = line.find('@') {
            let after_at = &line[at_pos + 1..];
            if let Some(space_or_end) = after_at.find(|c: char| c == 'E' || c == '\n') {
                after_at[..space_or_end].trim().to_string()
            } else {
                after_at.split_whitespace().take(2).collect::<Vec<_>>().join(" ")
            }
        } else {
            "N/A".to_string()
        };
        
        let eta = if let Some(eta_pos) = line.find("ETA:") {
            line[eta_pos + 4..].trim().to_string()
        } else if let Some(eta_pos) = line.find("eta:") {
            line[eta_pos + 4..].trim().to_string()
        } else {
            "Calculating...".to_string()
        };
        
        Some((progress, downloaded, total, speed, eta))
    }
}

#[async_trait]
impl StoreAdapter for GogdlAdapter {
    fn name(&self) -> &'static str {
        "gog"
    }
    
    fn is_available(&self) -> bool {
        self.binary_path.exists()
    }
    
    async fn is_authenticated(&self) -> bool {
        // Check if auth token exists in Heroic's gog_store
        let auth_file = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/auth.json"))
            .unwrap_or_default();
        
        if !auth_file.exists() {
            log::info!("GOG auth file not found at {:?}", auth_file);
            return false;
        }
        
        // Verify the auth file has valid tokens
        // Heroic stores auth as: { "user_id": { "access_token": "...", ... } }
        if let Ok(content) = std::fs::read_to_string(&auth_file) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                // Check for direct access_token (old format)
                if data.get("access_token").is_some() || data.get("accessToken").is_some() {
                    log::info!("GOG authenticated (direct token)");
                    return true;
                }
                
                // Check for nested format: { "user_id": { "access_token": ... } }
                if let Some(obj) = data.as_object() {
                    for (key, value) in obj {
                        // Skip non-numeric keys (user_id is numeric)
                        if key.parse::<u64>().is_ok() {
                            if value.get("access_token").is_some() {
                                log::info!("GOG authenticated (user_id: {})", key);
                                return true;
                            }
                        }
                    }
                }
            }
        }
        
        log::info!("GOG not authenticated");
        false
    }
    
    async fn list_games(&self) -> anyhow::Result<Vec<Game>> {
        log::info!("Starting GOG games sync...");
        
        // Read from Heroic's store_cache/gog_library.json (the actual location)
        let library_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/store_cache/gog_library.json"))
            .unwrap_or_default();
        
        log::info!("Looking for GOG library at: {:?}", library_path);
        
        if !library_path.exists() {
            log::warn!("GOG library not found at {:?}", library_path);
            // Try to return installed games even without library
            return self.list_installed_games_only().await;
        }
        
        let content = tokio::fs::read_to_string(&library_path).await?;
        let library: serde_json::Value = serde_json::from_str(&content)?;
        
        let games_array = library.get("games").and_then(|g| g.as_array());
        
        if games_array.is_none() {
            log::warn!("GOG library has no 'games' array");
            return self.list_installed_games_only().await;
        }
        
        // Get installed games data
        let installed_data = self.read_installed_games();
        log::info!("Installed GOG games from Heroic: {:?}", installed_data.keys().collect::<Vec<_>>());
        
        let now = Utc::now();
        let games: Vec<Game> = games_array
            .map(|arr| {
                log::info!("Processing {} games from GOG library", arr.len());
                arr.iter()
                    .filter_map(|g| {
                        // GOG uses app_name not appName in store_cache
                        let app_name = g.get("app_name")
                            .or_else(|| g.get("appName"))
                            .and_then(|v| v.as_str())?;
                        let title = g.get("title")?.as_str()?;
                        
                        // Skip DLCs and redistributables
                        let is_dlc = g.get("install")
                            .and_then(|i| i.get("is_dlc"))
                            .and_then(|d| d.as_bool())
                            .unwrap_or(false);
                        
                        if is_dlc {
                            log::debug!("Skipping DLC: {}", title);
                            return None;
                        }
                        
                        // Skip redistributables
                        if app_name == "gog-redist" {
                            log::debug!("Skipping redistributable: {}", title);
                            return None;
                        }
                        
                        let is_installed = installed_data.contains_key(app_name);
                        let install_path = installed_data.get(app_name).cloned();
                        
                        log::debug!("GOG game: {} ({}), installed: {}", title, app_name, is_installed);
                        
                        // Read wine config from Heroic GamesConfig
                        let (wine_prefix, wine_version) = self.read_heroic_game_config(app_name)
                            .unwrap_or((String::new(), String::new()));
                        
                        Some(Game {
                            id: format!("gog_{}", app_name),
                            title: title.to_string(),
                            store: "gog".to_string(),
                            store_id: app_name.to_string(),
                            installed: is_installed,
                            install_path,
                            wine_prefix: if wine_prefix.is_empty() { None } else { Some(wine_prefix) },
                            wine_version: if wine_version.is_empty() { None } else { Some(wine_version) },
                            cover_url: g.get("art_square").and_then(|u| u.as_str()).map(String::from),
                            background_url: g.get("art_cover")
                                .or_else(|| g.get("art_background"))
                                .and_then(|u| u.as_str())
                                .map(String::from),
                            developer: g.get("developer").and_then(|d| d.as_str()).map(String::from),
                            publisher: g.get("publisher").and_then(|p| p.as_str()).map(String::from),
                            description: g.get("extra")
                                .and_then(|e| e.get("about"))
                                .and_then(|a| a.get("description"))
                                .and_then(|d| d.as_str())
                                .map(String::from),
                            release_date: None,
                            last_played: None,
                            play_time_minutes: 0,
                            created_at: now,
                            updated_at: now,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        
        log::info!("Found {} GOG games (excluding DLCs)", games.len());
        Ok(games)
    }
    
    async fn launch_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Launching GOG game: {}", store_id);
        
        // Read wine config from Heroic
        let (wine_prefix, _wine_version) = self.read_heroic_game_config(store_id)
            .unwrap_or((String::new(), String::new()));
        
        let mut cmd = Command::new(&self.binary_path);
        cmd.args(["launch", store_id])
            .env("GOGDL_CONFIG_PATH", &self.config_path);
        
        // If wine prefix exists, pass it
        if !wine_prefix.is_empty() {
            log::info!("Using wine prefix: {}", wine_prefix);
            cmd.env("WINEPREFIX", wine_prefix);
        }
        
        cmd.spawn()?;
        
        Ok(())
    }
    
    async fn install_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Installing GOG game: {}", store_id);
        self.run_command(&["download", store_id]).await?;
        Ok(())
    }
    
    async fn uninstall_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Uninstalling GOG game: {}", store_id);
        // GOGDL doesn't have uninstall, would need to delete manually
        anyhow::bail!("GOG uninstall not implemented - please use Heroic Launcher")
    }
}