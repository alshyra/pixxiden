use crate::commands::InstallProgressEvent;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{Emitter, Window};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// GOGDL adapter for GOG Galaxy
/// Uses Heroic Launcher's gogdl binary
pub struct GogdlAdapter {
    binary_path: PathBuf,
    config_path: PathBuf,
}

// TODO: Structures GogGame, InstalledGame, InstalledGames migrated to GogdlService.ts
// Only binary/config detection and CLI command execution remain in Rust

/// Simple structure to support launch_game_with_custom_exe
#[derive(Debug, Clone)]
struct InstalledGameInfo {
    pub install_path: Option<String>,
    pub platform: Option<String>,
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
        let heroic_path =
            PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/gogdl");
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

    // TODO: find_wine_ge, launch_game_with_wine, run_command methods removed
    // Game launching is now handled via TypeScript services calling CLI directly

    /// Read installed games from Heroic's gog_store/installed.json
    /// Simple structure to support launch_game_with_custom_exe
    fn read_installed_games(&self) -> std::collections::HashMap<String, InstalledGameInfo> {
        use serde::Deserialize;

        #[derive(Debug, Deserialize)]
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

        let installed_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/installed.json"))
            .unwrap_or_default();

        let mut result = std::collections::HashMap::new();

        if let Ok(content) = std::fs::read_to_string(&installed_path) {
            if let Ok(data) = serde_json::from_str::<InstalledGames>(&content) {
                for game in data.installed {
                    result.insert(
                        game.app_name.clone(),
                        InstalledGameInfo {
                            install_path: game.install_path,
                            platform: game.platform,
                        },
                    );
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
                    let wine_prefix = game_config
                        .get("winePrefix")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let wine_version = game_config
                        .get("wineVersion")
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

    // TODO: run_command, scan_installed_games, find_executable methods removed
    // These have been migrated to TypeScript services

    /// Install with progress events (must be outside trait impl)
    pub async fn install_game_with_progress(
        &self,
        store_id: &str,
        window: &Window,
        game_id: &str,
    ) -> anyhow::Result<()> {
        log::info!("Installing GOG game with progress: {}", store_id);

        let mut child = Command::new(&self.binary_path)
            .args(["download", store_id])
            .env("GOGDL_CONFIG_PATH", &self.config_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;
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
            let num_start = before_pct
                .rfind(|c: char| !c.is_ascii_digit() && c != '.')
                .map(|p| p + 1)
                .unwrap_or(0);
            before_pct[num_start..].trim().parse().ok()?
        } else {
            return None;
        };

        let (downloaded, total) =
            if let (Some(paren_start), Some(paren_end)) = (line.find('('), line.find(')')) {
                let size_str = &line[paren_start + 1..paren_end];
                if let Some(slash_pos) = size_str.find('/') {
                    (
                        size_str[..slash_pos].trim().to_string(),
                        size_str[slash_pos + 1..].trim().to_string(),
                    )
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
                after_at
                    .split_whitespace()
                    .take(2)
                    .collect::<Vec<_>>()
                    .join(" ")
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
    pub async fn launch_game_with_custom_exe(
        &self,
        store_id: &str,
        custom_executable: Option<&str>,
    ) -> anyhow::Result<()> {
        log::info!(
            "Launching GOG game: {} (custom_exe: {:?})",
            store_id,
            custom_executable
        );

        // Check if gogdl binary is available
        if !self.binary_path.exists() {
            anyhow::bail!("GOGDL binary not found. Please install Heroic Launcher")
        }

        // Read installed games to get install_path and platform
        let installed_games = self.read_installed_games();
        let installed_game = installed_games.get(store_id).ok_or_else(|| {
            anyhow::anyhow!("Game {} not found in Heroic installed games", store_id)
        })?;

        let install_path = installed_game
            .install_path
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No install path found for game {}", store_id))?;

        let platform = installed_game.platform.as_deref().unwrap_or("windows");

        // Read wine config from Heroic
        let (wine_prefix, wine_version) = self
            .read_heroic_game_config(store_id)
            .unwrap_or((String::new(), String::new()));

        log::info!(
            "Launching with path: {}, platform: {}",
            install_path,
            platform
        );

        // Get auth config path from Heroic
        let auth_config_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/auth.json"))
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;

        if !auth_config_path.exists() {
            anyhow::bail!(
                "GOG auth config not found at {:?}. Please login to GOG in Heroic Launcher first.",
                auth_config_path
            );
        }

        let mut cmd = Command::new(&self.binary_path);
        // gogdl requires --auth-config-path and launch needs: path id --platform
        cmd.args([
            "--auth-config-path",
            auth_config_path.to_str().unwrap_or(""),
            "launch",
            install_path,
            store_id,
            "--platform",
            platform,
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

    /// Check if GOGDL binary is available
    pub fn is_available(&self) -> bool {
        self.binary_path.exists()
    }

    /// Check if user is authenticated to GOG
    pub async fn is_authenticated(&self) -> bool {
        // Check if auth token exists in Heroic's gog_store
        let auth_file = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/auth.json"))
            .unwrap_or_default();

        if !auth_file.exists() {
            log::info!("GOG auth file not found at {:?}", auth_file);
            return false;
        }

        // Verify the auth file has valid tokens
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

    /// DEPRECATED: Migrated to GogdlService.ts
    pub async fn uninstall_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("uninstall_game() migrated to GogdlService.ts - use TypeScript implementation")
    }
}

// TODO: StoreAdapter trait implementation removed
// All game library operations (list_games, launch_game, install_game, uninstall_game)
// migrated to GogdlService.ts in TypeScript
// Only binary detection, config paths, Wine helper methods, and authentication check remain in Rust
