use crate::database::Game;
use crate::store::StoreAdapter;
use async_trait::async_trait;
use chrono::Utc;
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

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
        // Check if auth token exists in config
        let auth_file = self.config_path.join("auth.json");
        auth_file.exists()
    }
    
    async fn list_games(&self) -> anyhow::Result<Vec<Game>> {
        // GOGDL uses Heroic's library, try to read from there
        let library_path = dirs::home_dir()
            .map(|h| h.join(".config/heroic/gog_store/library.json"))
            .unwrap_or_default();
        
        if !library_path.exists() {
            log::warn!("GOG library not found at {:?}", library_path);
            return Ok(vec![]);
        }
        
        let content = tokio::fs::read_to_string(&library_path).await?;
        let library: serde_json::Value = serde_json::from_str(&content)?;
        
        let games_array = library.get("games").and_then(|g| g.as_array());
        
        let now = Utc::now();
        let games: Vec<Game> = games_array
            .map(|arr| {
                arr.iter()
                    .filter_map(|g| {
                        let app_name = g.get("appName")?.as_str()?;
                        let title = g.get("title")?.as_str()?;
                        
                        Some(Game {
                            id: format!("gog_{}", app_name),
                            title: title.to_string(),
                            store: "gog".to_string(),
                            store_id: app_name.to_string(),
                            installed: g.get("is_installed").and_then(|i| i.as_bool()).unwrap_or(false),
                            install_path: g.get("install_path").and_then(|p| p.as_str()).map(String::from),
                            wine_prefix: None,
                            wine_version: None,
                            cover_url: g.get("art_square").and_then(|u| u.as_str()).map(String::from),
                            background_url: g.get("art_cover").and_then(|u| u.as_str()).map(String::from),
                            developer: g.get("developer").and_then(|d| d.as_str()).map(String::from),
                            publisher: g.get("publisher").and_then(|p| p.as_str()).map(String::from),
                            description: None,
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
        
        log::info!("Found {} GOG games", games.len());
        Ok(games)
    }
    
    async fn launch_game(&self, store_id: &str) -> anyhow::Result<()> {
        log::info!("Launching GOG game: {}", store_id);
        
        Command::new(&self.binary_path)
            .args(["launch", store_id])
            .env("GOGDL_CONFIG_PATH", &self.config_path)
            .spawn()?;
        
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
        anyhow::bail!("GOG uninstall not implemented")
    }
}
