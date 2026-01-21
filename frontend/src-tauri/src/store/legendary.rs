use crate::database::Game;
use crate::store::StoreAdapter;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Stdio;
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
        let heroic_path = PathBuf::from("/opt/Heroic/resources/app.asar.unpacked/build/bin/x64/linux/legendary");
        if heroic_path.exists() {
            return heroic_path;
        }
        
        // Flatpak Heroic
        let flatpak_path = dirs::home_dir()
            .map(|h| h.join(".var/app/com.heroicgameslauncher.hgl/config/heroic/tools/legendary/legendary"))
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
                    .or_else(|| images.iter().find(|img| img.image_type == "DieselGameBoxWide"))
                    .map(|img| img.url.clone())
            })
        })
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
        
        // Get installed games
        let installed_output = self.run_command(&["list-installed", "--json"]).await.unwrap_or_default();
        let installed_games: Vec<LegendaryGameInfo> = serde_json::from_str(&installed_output).unwrap_or_default();
        let installed_ids: std::collections::HashSet<String> = installed_games
            .iter()
            .map(|g| g.app_name.clone())
            .collect();
        
        let now = Utc::now();
        let games: Vec<Game> = games_data
            .into_iter()
            .map(|g| {
                let id = format!("epic_{}", g.app_name);
                Game {
                    id,
                    title: g.app_title,
                    store: "epic".to_string(),
                    store_id: g.app_name.clone(),
                    installed: installed_ids.contains(&g.app_name),
                    install_path: None,
                    cover_url: Self::extract_cover_url(&g.metadata),
                    background_url: Self::extract_background_url(&g.metadata),
                    developer: g.metadata.as_ref().and_then(|m| m.developer.clone()),
                    publisher: None,
                    description: g.metadata.as_ref().and_then(|m| m.description.clone()),
                    release_date: g.metadata.as_ref().and_then(|m| {
                        m.release_info.as_ref().and_then(|r| r.first().and_then(|ri| ri.date_added.clone()))
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
        
        // Use spawn to launch without waiting
        Command::new(&self.binary_path)
            .args(["launch", store_id])
            .env("LEGENDARY_CONFIG_PATH", &self.config_path)
            .spawn()?;
        
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
