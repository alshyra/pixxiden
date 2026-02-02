use crate::commands::InstallProgressEvent;
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
#[allow(dead_code)]
struct LegendaryStatus {
    account: Option<String>,
    games_available: Option<i32>,
}

// TODO: The following parsing structures (LegendaryGameInfo, GameMetadata, etc.) have been
// migrated to TypeScript (LegendaryService.ts). This file now only handles:
// - Binary detection (find_binary, find_config)
// - Command execution (run_command, launch_game, install_game)
// Keep only the minimal adapter interface

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

    // TODO: read_heroic_game_config method removed
    // Wine configuration is now read via TypeScript services

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

    /// Check if Legendary CLI is available
    pub fn is_available(&self) -> bool {
        self.binary_path.exists() || which::which("legendary").is_ok()
    }

    /// Check if user is authenticated to Epic Games
    pub async fn is_authenticated(&self) -> bool {
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

    /// DEPRECATED: Migrated to LegendaryService.ts
    pub async fn launch_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("launch_game() migrated to LegendaryService.ts - use TypeScript implementation")
    }

    /// DEPRECATED: Migrated to LegendaryService.ts
    pub async fn uninstall_game(&self, _store_id: &str) -> anyhow::Result<()> {
        anyhow::bail!("uninstall_game() migrated to LegendaryService.ts - use TypeScript implementation")
    }
}

// TODO: StoreAdapter trait implementation removed
// All game library operations (list_games, launch_game, install_game, uninstall_game)
// migrated to LegendaryService.ts in TypeScript
// Only binary detection, CLI command execution, and authentication check remain in Rust
