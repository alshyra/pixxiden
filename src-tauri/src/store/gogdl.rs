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

#[derive(Debug, Deserialize, Clone)]
struct InstalledGame {
    #[serde(rename = "appName")]
    app_name: String,
    install_path: Option<String>,
    platform: Option<String>,
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
    
    /// Find Wine-GE installation
    fn find_wine_ge(&self) -> anyhow::Result<PathBuf> {
        // Check standard Wine-GE locations
        let potential_paths = vec![
            // Heroic's Wine-GE
            dirs::home_dir()
                .map(|h| h.join(".config/heroic/tools/wine/wine-ge-latest/bin/wine")),
            // GE-Proton location
            dirs::home_dir()
                .map(|h| h.join(".local/share/lutris/runners/wine/wine-ge-latest/bin/wine")),
            // System wine-ge
            Some(PathBuf::from("/usr/bin/wine-ge")),
            // Fallback to system wine
            Some(PathBuf::from("/usr/bin/wine")),
        ];
        
        for path in potential_paths.into_iter().flatten() {
            if path.exists() {
                log::info!("Found Wine at: {:?}", path);
                return Ok(path);
            }
        }
        
        anyhow::bail!("Wine-GE or Wine not found. Please install wine-ge or wine")
    }
    
    /// Launch a game directly with Wine-GE (for games installed in ~/GOG Games/)
    pub async fn launch_game_with_wine(&self, game: &Game) -> anyhow::Result<()> {
        let exe_path = game.install_path.as_ref()
            .and_then(|install| {
                // Try to find executable in install path
                let install_path = PathBuf::from(install);
                self.find_executable(&install_path)
            })
            .ok_or_else(|| anyhow::anyhow!("No executable found for game"))?;
        
        let wine = self.find_wine_ge()?;
        
        // Setup wine prefix
        let prefix = game.wine_prefix.as_ref()
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .map(|h| h.join(".local/share/pixiden/prefixes").join(&game.store_id))
                    .unwrap_or_else(|| PathBuf::from("/tmp/pixiden-prefix"))
            });
        
        // Create prefix directory if it doesn't exist
        if !prefix.exists() {
            log::info!("Creating Wine prefix at: {:?}", prefix);
            std::fs::create_dir_all(&prefix)?;
        }
        
        log::info!("Launching {} with Wine-GE", game.title);
        log::info!("  Executable: {}", exe_path);
        log::info!("  Wine: {:?}", wine);
        log::info!("  Prefix: {:?}", prefix);
        
        // Get the game directory for working directory
        let game_dir = game.install_path.as_ref()
            .map(PathBuf::from)
            .ok_or_else(|| anyhow::anyhow!("No install path"))?;
        
        let mut cmd = Command::new(wine);
        cmd.arg(&exe_path)
            .env("WINEPREFIX", prefix)
            .env("WINEDEBUG", "-all") // Suppress wine debug output
            .env("DXVK_HUD", "0")
            .current_dir(&game_dir)
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        
        cmd.spawn()?;
        log::info!("Game launched successfully");
        
        Ok(())
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
    fn read_installed_games(&self) -> HashMap<String, InstalledGame> {
        let installed_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/installed.json"))
            .unwrap_or_default();
        
        let mut result = HashMap::new();
        
        if let Ok(content) = std::fs::read_to_string(&installed_path) {
            if let Ok(data) = serde_json::from_str::<InstalledGames>(&content) {
                for game in data.installed {
                    result.insert(game.app_name.clone(), game);
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
    
    /// Scan ~/GOG Games/ directory to detect installed GOG games
    /// This is an alternative method when Heroic isn't installed
    pub async fn scan_installed_games(&self) -> anyhow::Result<Vec<Game>> {
        let gog_games_dir = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Home directory not found"))?
            .join("GOG Games");
        
        if !gog_games_dir.exists() {
            log::info!("GOG Games directory not found at {:?}", gog_games_dir);
            return Ok(vec![]);
        }
        
        log::info!("Scanning GOG Games directory: {:?}", gog_games_dir);
        
        let mut games = Vec::new();
        let now = Utc::now();
        
        let entries = std::fs::read_dir(&gog_games_dir)
            .map_err(|e| anyhow::anyhow!("Failed to read GOG Games dir: {}", e))?;
        
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            
            let dir_name = entry.file_name().to_string_lossy().to_string();
            let dir_name_lower = dir_name.to_lowercase();
            
            // Detect known games (can be extended)
            let (title, app_id) = if dir_name_lower.contains("baldur") {
                ("Baldur's Gate 3".to_string(), "baldurs_gate_3".to_string())
            } else if dir_name_lower.contains("witcher") && dir_name_lower.contains("3") {
                ("The Witcher 3: Wild Hunt".to_string(), "the_witcher_3".to_string())
            } else if dir_name_lower.contains("cyberpunk") {
                ("Cyberpunk 2077".to_string(), "cyberpunk_2077".to_string())
            } else {
                // Generic fallback
                (dir_name.clone(), dir_name.to_lowercase().replace(" ", "_"))
            };
            
            // Find executable
            let executable_path = self.find_executable(&path);
            
            if executable_path.is_none() {
                log::warn!("No executable found in {:?}, skipping", path);
                continue;
            }
            
            log::info!("Found GOG game: {} at {:?}", title, path);
            
            // Create default wine prefix
            let wine_prefix = dirs::home_dir()
                .map(|h| h.join(".local/share/pixiden/prefixes").join(&app_id))
                .and_then(|p| p.to_str().map(|s| s.to_string()));
            
            let game = Game {
                id: format!("gog_{}", app_id),
                title,
                store: "gog".to_string(),
                store_id: app_id,
                installed: true,
                install_path: Some(path.to_string_lossy().to_string()),
                custom_executable: None,
                wine_prefix,
                wine_version: Some("wine-ge".to_string()),
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
            };
            
            games.push(game);
        }
        
        log::info!("Found {} games in GOG Games directory", games.len());
        Ok(games)
    }
    
    /// Find the main executable in a game directory
    fn find_executable(&self, game_dir: &std::path::Path) -> Option<String> {
        // Common executable names for popular games
        let known_exes = [
            "bg3_dx11.exe",
            "bg3.exe",
            "witcher3.exe",
            "Cyberpunk2077.exe",
            "start.exe",
            "launch.exe",
        ];
        
        // First, try known executables
        for exe in &known_exes {
            let exe_path = game_dir.join(exe);
            if exe_path.exists() {
                return Some(exe_path.to_string_lossy().to_string());
            }
            
            // Try in bin/ subdirectory
            let bin_exe_path = game_dir.join("bin").join(exe);
            if bin_exe_path.exists() {
                return Some(bin_exe_path.to_string_lossy().to_string());
            }
        }
        
        // Fallback: find any .exe file in the root
        if let Ok(entries) = std::fs::read_dir(game_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("exe") {
                    log::info!("Found executable: {:?}", path);
                    return Some(path.to_string_lossy().to_string());
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
            .map(|(app_name, installed_game)| {
                let install_path = installed_game.install_path.unwrap_or_default();
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
                    custom_executable: None,
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
    
    /// Find wine binary path from Heroic wine version name
    fn find_wine_binary(&self, wine_version: &str) -> Option<String> {
        // Check common Heroic wine locations
        let heroic_wine_dir = dirs::home_dir()?.join(".config/heroic/tools/wine");
        
        // Try to find the wine version directory
        if let Ok(entries) = std::fs::read_dir(&heroic_wine_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = entry.file_name().to_string_lossy().to_string();
                    if dir_name.contains(wine_version) || wine_version.contains(&dir_name) {
                        let wine_bin = path.join("bin/wine");
                        if wine_bin.exists() {
                            return Some(wine_bin.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
        
        // Check Proton locations
        let proton_dir = dirs::home_dir()?.join(".config/heroic/tools/proton");
        if let Ok(entries) = std::fs::read_dir(&proton_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = entry.file_name().to_string_lossy().to_string();
                    if dir_name.contains(wine_version) || wine_version.contains(&dir_name) {
                        let wine_bin = path.join("files/bin/wine");
                        if wine_bin.exists() {
                            return Some(wine_bin.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
        
        None
    }
    
    /// Launch a GOG game with optional custom executable override
    pub async fn launch_game_with_custom_exe(&self, store_id: &str, custom_executable: Option<&str>) -> anyhow::Result<()> {
        log::info!("Launching GOG game: {} (custom_exe: {:?})", store_id, custom_executable);
        
        // Check if gogdl binary is available
        if !self.binary_path.exists() {
            anyhow::bail!("GOGDL binary not found. Please install Heroic Launcher")
        }
        
        // Read installed games to get install_path and platform
        let installed_games = self.read_installed_games();
        let installed_game = installed_games.get(store_id)
            .ok_or_else(|| anyhow::anyhow!("Game {} not found in Heroic installed games", store_id))?;
        
        let install_path = installed_game.install_path.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No install path found for game {}", store_id))?;
        
        let platform = installed_game.platform.as_deref().unwrap_or("windows");
        
        // Read wine config from Heroic
        let (wine_prefix, wine_version) = self.read_heroic_game_config(store_id)
            .unwrap_or((String::new(), String::new()));
        
        log::info!("Launching with path: {}, platform: {}", install_path, platform);
        
        // Get auth config path from Heroic
        let auth_config_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/auth.json"))
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
        
        if !auth_config_path.exists() {
            anyhow::bail!("GOG auth config not found at {:?}. Please login to GOG in Heroic Launcher first.", auth_config_path);
        }
        
        let mut cmd = Command::new(&self.binary_path);
        // gogdl requires --auth-config-path and launch needs: path id --platform
        cmd.args([
            "--auth-config-path", auth_config_path.to_str().unwrap_or(""),
            "launch", install_path, store_id, 
            "--platform", platform
        ]);
        
        // If custom executable is specified, use --override-exe
        if let Some(exe) = custom_executable {
            if !exe.is_empty() {
                log::info!("Using custom executable: {}", exe);
                cmd.args(["--override-exe", exe]);
            }
        }
        
        // If wine prefix exists, pass it as argument
        if !wine_prefix.is_empty() {
            log::info!("Using wine prefix: {}", wine_prefix);
            cmd.args(["--wine-prefix", &wine_prefix]);
        }
        
        // If wine version specified, try to find and pass the wine binary
        if !wine_version.is_empty() {
            if let Some(wine_bin) = self.find_wine_binary(&wine_version) {
                log::info!("Using wine: {}", wine_bin);
                cmd.args(["--wine", &wine_bin]);
            }
        }
        
        log::info!("Executing: {:?}", cmd);
        cmd.spawn()?;
        
        Ok(())
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
                        let install_path = installed_data.get(app_name)
                            .and_then(|g| g.install_path.clone());
                        
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
                            custom_executable: None,
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
        
        // Check if gogdl binary is available
        if !self.binary_path.exists() {
            anyhow::bail!("GOGDL binary not found. Please install Heroic Launcher or use scan_gog_installed for ~/GOG Games/ detection")
        }
        
        // Read installed games to get install_path and platform
        let installed_games = self.read_installed_games();
        let installed_game = installed_games.get(store_id)
            .ok_or_else(|| anyhow::anyhow!("Game {} not found in Heroic installed games", store_id))?;
        
        let install_path = installed_game.install_path.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No install path found for game {}", store_id))?;
        
        let platform = installed_game.platform.as_deref().unwrap_or("windows");
        
        // Read wine config from Heroic
        let (wine_prefix, wine_version) = self.read_heroic_game_config(store_id)
            .unwrap_or((String::new(), String::new()));
        
        log::info!("Launching with path: {}, platform: {}", install_path, platform);
        
        // Get auth config path from Heroic
        let auth_config_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/auth.json"))
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
        
        if !auth_config_path.exists() {
            anyhow::bail!("GOG auth config not found at {:?}. Please login to GOG in Heroic Launcher first.", auth_config_path);
        }
        
        let mut cmd = Command::new(&self.binary_path);
        // gogdl requires --auth-config-path and launch needs: path id --platform
        cmd.args([
            "--auth-config-path", auth_config_path.to_str().unwrap_or(""),
            "launch", install_path, store_id, 
            "--platform", platform
        ]);
        
        // If wine prefix exists, pass it as argument
        if !wine_prefix.is_empty() {
            log::info!("Using wine prefix: {}", wine_prefix);
            cmd.args(["--wine-prefix", &wine_prefix]);
        }
        
        // If wine version specified, try to find and pass the wine binary
        if !wine_version.is_empty() {
            if let Some(wine_bin) = self.find_wine_binary(&wine_version) {
                log::info!("Using wine: {}", wine_bin);
                cmd.args(["--wine", &wine_bin]);
            }
        }
        
        log::info!("Executing: {:?}", cmd);
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