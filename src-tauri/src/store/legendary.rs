use crate::commands::InstallProgressEvent;
use crate::database::Game;
use crate::store::StoreAdapter;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{Emitter, Window};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

/// Legendary adapter for Epic Games Store
/// Uses Heroic Launcher's legendary binary and config
pub struct LegendaryAdapter {
    binary_path: PathBuf,
    config_path: PathBuf,
}

#[derive(Debug, Deserialize)]
struct LegendaryStatus {
    account: Option<String>,
    games_available: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct LegendaryGameInfo {
    app_name: String,
    app_title: String,
    asset_infos: Option<serde_json::Value>,
    metadata: Option<GameMetadata>,
}

#[derive(Debug, Deserialize)]
struct GameMetadata {
    description: Option<String>,
    developer: Option<String>,
    #[serde(rename = "developerId")]
    developer_id: Option<String>,
    #[serde(rename = "keyImages")]
    key_images: Option<Vec<KeyImage>>,
    #[serde(rename = "releaseInfo")]
    release_info: Option<Vec<ReleaseInfo>>,
}

#[derive(Debug, Deserialize)]
struct KeyImage {
    #[serde(rename = "type")]
    image_type: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct ReleaseInfo {
    #[serde(rename = "dateAdded")]
    date_added: Option<String>,
}

impl LegendaryAdapter {
    pub fn new() -> Self {
        // Try Heroic Launcher's bundled binary first, then system legendary
        let binary_path = Self::find_binary();
        let config_path = Self::find_config();

        log::info!("Legendary binary: {:?}", binary_path);
        log::info!("Legendary config: {:?}", config_path);

        Self {
            binary_path,
            config_path,
        }
    }

    fn find_binary() -> PathBuf {
        // Heroic Launcher bundled binary
        let heroic_path =
            PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary");
        if heroic_path.exists() {
            return heroic_path;
        }

        // Flatpak Heroic
        let flatpak_path = dirs::home_dir()
            .map(|h| {
                h.join(
                    ".var/app/com.heroicgameslauncher.hgl/config/heroic/tools/legendary/legendary",
                )
            })
            .unwrap_or_default();
        if flatpak_path.exists() {
            return flatpak_path;
        }

        // System legendary
        PathBuf::from("legendary")
    }

    fn find_config() -> PathBuf {
        // Heroic Launcher's legendary config
        let heroic_config = dirs::home_dir()
            .map(|h| h.join(".config/heroic/legendaryConfig/legendary"))
            .unwrap_or_default();
        if heroic_config.exists() {
            return heroic_config;
        }

        // Flatpak Heroic config
        let flatpak_config = dirs::home_dir()
            .map(|h| h.join(".var/app/com.heroicgameslauncher.hgl/config/legendary"))
            .unwrap_or_default();
        if flatpak_config.exists() {
            return flatpak_config;
        }

        // Default legendary config
        dirs::config_dir()
            .map(|c| c.join("legendary"))
            .unwrap_or_else(|| PathBuf::from("~/.config/legendary"))
    }

    async fn run_command(&self, args: &[&str]) -> anyhow::Result<String> {
        let output = Command::new(&self.binary_path)
            .args(args)
            .env("LEGENDARY_CONFIG_PATH", &self.config_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Legendary command failed: {}", stderr);
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    fn extract_cover_url(metadata: &Option<GameMetadata>) -> Option<String> {
        metadata.as_ref().and_then(|m| {
            m.key_images.as_ref().and_then(|images| {
                // Prefer DieselGameBoxTall (vertical cover)
                images
                    .iter()
                    .find(|img| img.image_type == "DieselGameBoxTall")
                    .or_else(|| images.iter().find(|img| img.image_type == "DieselGameBox"))
                    .or_else(|| images.first())
                    .map(|img| img.url.clone())
            })
        })
    }

    fn extract_background_url(metadata: &Option<GameMetadata>) -> Option<String> {
        metadata.as_ref().and_then(|m| {
            m.key_images.as_ref().and_then(|images| {
                // Prefer DieselGameBox (horizontal/wide)
                images
                    .iter()
                    .find(|img| img.image_type == "DieselGameBox")
                    .or_else(|| {
                        images
                            .iter()
                            .find(|img| img.image_type == "DieselGameBoxWide")
                    })
                    .map(|img| img.url.clone())
            })
        })
    }

    /// Read Heroic's installed.json to get installed games and their paths
    fn read_installed_json(&self) -> std::collections::HashMap<String, String> {
        let installed_path = self.config_path.join("installed.json");
        let mut result = std::collections::HashMap::new();

        if let Ok(content) = std::fs::read_to_string(&installed_path) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = data.as_object() {
                    for (app_name, info) in obj {
                        if let Some(install_path) =
                            info.get("install_path").and_then(|v| v.as_str())
                        {
                            result.insert(app_name.clone(), install_path.to_string());
                        }
                    }
                }
            }
        }

        log::info!("Found {} installed Epic games from Heroic", result.len());
        result
    }

    /// Read Heroic's GamesConfig/{app_name}.json to get wine config
    fn read_heroic_game_config(&self, app_name: &str) -> Option<(String, String)> {
        let config_dir = dirs::home_dir()?.join(".config/heroic/GamesConfig");
        let config_path = config_dir.join(format!("{}.json", app_name));

        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(game_config) = data.get(app_name) {
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

    /// Install with progress events (must be outside trait impl)
    pub async fn install_game_with_progress(
        &self,
        store_id: &str,
        window: &Window,
        game_id: &str,
    ) -> anyhow::Result<()> {
        log::info!("Installing Epic game with progress: {}", store_id);

        let mut child = Command::new(&self.binary_path)
            .args(["install", store_id, "-y", "--status-update-freq", "0.5"])
            .env("LEGENDARY_CONFIG_PATH", &self.config_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;
        let mut reader = BufReader::new(stderr).lines();

        // Parse progress from legendary output
        // Format: [cli] INFO: = Progress: 45.32% (1.23/2.72 GiB), Running for 00:05:32, ETA: 00:06:30
        while let Some(line) = reader.next_line().await? {
            log::debug!("Legendary output: {}", line);

            if line.contains("Progress:") {
                if let Some(progress_data) = Self::parse_legendary_progress(&line) {
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
            anyhow::bail!(
                "Legendary install failed with exit code: {:?}",
                status.code()
            );
        }

        Ok(())
    }

    /// Parse legendary progress line
    fn parse_legendary_progress(line: &str) -> Option<(f32, String, String, String, String)> {
        let progress_start = line.find("Progress:")? + 10;
        let progress_end = line[progress_start..].find('%')? + progress_start;
        let progress: f32 = line[progress_start..progress_end].trim().parse().ok()?;

        let paren_start = line.find('(')? + 1;
        let paren_end = line.find(')')?;
        let size_str = &line[paren_start..paren_end];
        let size_parts: Vec<&str> = size_str.split('/').collect();
        let downloaded = size_parts.get(0).unwrap_or(&"0").trim().to_string();
        let total_with_unit = size_parts.get(1).unwrap_or(&"0").trim().to_string();

        let eta = if let Some(eta_start) = line.find("ETA:") {
            line[eta_start + 4..].trim().to_string()
        } else {
            "Calculating...".to_string()
        };

        let speed = "N/A".to_string();

        Some((progress, downloaded, total_with_unit, speed, eta))
    }
}

#[async_trait]
impl StoreAdapter for LegendaryAdapter {
    fn name(&self) -> &'static str {
        "epic"
    }

    fn is_available(&self) -> bool {
        self.binary_path.exists() || which::which("legendary").is_ok()
    }

    async fn is_authenticated(&self) -> bool {
        match self.run_command(&["status", "--json"]).await {
            Ok(output) => {
                if let Ok(status) = serde_json::from_str::<LegendaryStatus>(&output) {
                    status.account.is_some()
                } else {
                    false
                }
            }
            Err(_) => false,
        }
    }

    async fn list_games(&self) -> anyhow::Result<Vec<Game>> {
        let output = self.run_command(&["list", "--json"]).await?;
        let games_data: Vec<LegendaryGameInfo> = serde_json::from_str(&output)?;

        // Get installed games from Heroic's installed.json (more reliable)
        let installed_data = self.read_installed_json();
        let installed_ids: std::collections::HashSet<String> =
            installed_data.keys().cloned().collect();
        let install_paths: std::collections::HashMap<String, String> = installed_data;

        let now = Utc::now();
        let games: Vec<Game> = games_data
            .into_iter()
            .map(|g| {
                let id = format!("epic_{}", g.app_name);
                let (wine_prefix, wine_version) = self
                    .read_heroic_game_config(&g.app_name)
                    .unwrap_or((String::new(), String::new()));

                Game {
                    id,
                    title: g.app_title,
                    store: "epic".to_string(),
                    store_id: g.app_name.clone(),
                    installed: installed_ids.contains(&g.app_name),
                    install_path: install_paths.get(&g.app_name).cloned(),
                    custom_executable: None,
                    wine_prefix: if wine_prefix.is_empty() {
                        None
                    } else {
                        Some(wine_prefix)
                    },
                    wine_version: if wine_version.is_empty() {
                        None
                    } else {
                        Some(wine_version)
                    },
                    cover_url: Self::extract_cover_url(&g.metadata),
                    background_url: Self::extract_background_url(&g.metadata),
                    developer: g.metadata.as_ref().and_then(|m| m.developer.clone()),
                    publisher: None,
                    description: g.metadata.as_ref().and_then(|m| m.description.clone()),
                    release_date: g.metadata.as_ref().and_then(|m| {
                        m.release_info
                            .as_ref()
                            .and_then(|r| r.first().and_then(|ri| ri.date_added.clone()))
                    }),
                    last_played: None,
                    play_time_minutes: 0,
                    created_at: now,
                    updated_at: now,
                }
            })
            .collect();

        log::info!("Found {} Epic Games", games.len());
        Ok(games)
    }

    async fn launch_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Launching Epic game: {}", store_id);

        // Read wine config from Heroic
        let (wine_prefix, _wine_version) = self
            .read_heroic_game_config(store_id)
            .unwrap_or((String::new(), String::new()));

        let mut cmd = Command::new(&self.binary_path);
        cmd.args(["launch", store_id])
            .env("LEGENDARY_CONFIG_PATH", &self.config_path);

        // If wine prefix exists, pass it to legendary
        if !wine_prefix.is_empty() {
            log::info!("Using wine prefix: {}", wine_prefix);
            cmd.env("WINEPREFIX", wine_prefix);
        }

        cmd.spawn()?;

        Ok(())
    }

    async fn install_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Installing Epic game: {}", store_id);
        self.run_command(&["install", store_id, "-y"]).await?;
        Ok(())
    }

    async fn uninstall_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Uninstalling Epic game: {}", store_id);
        self.run_command(&["uninstall", store_id, "-y"]).await?;
        Ok(())
    }
}
