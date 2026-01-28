//! Achievements Service for fetching game achievements
//!
//! Supports:
//! - Steam Web API for Steam achievements
//! - Parsing legendary/gogdl/nile CLI output for Epic/GOG/Amazon achievements

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;

const STEAM_API_BASE: &str = "https://api.steampowered.com";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Achievement info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub api_name: String,
    pub name: String,
    pub description: Option<String>,
    pub achieved: bool,
    pub unlock_time: Option<i64>,
    pub icon_url: Option<String>,
    pub icon_gray_url: Option<String>,
}

/// Game achievements summary
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameAchievements {
    pub total: u32,
    pub unlocked: u32,
    pub achievements: Vec<Achievement>,
}

impl GameAchievements {
    pub fn completion_percentage(&self) -> f32 {
        if self.total == 0 {
            0.0
        } else {
            (self.unlocked as f32 / self.total as f32) * 100.0
        }
    }
}

/// Steam achievement schema response
#[derive(Debug, Deserialize)]
struct SteamSchemaResponse {
    game: Option<SteamGameSchema>,
}

#[derive(Debug, Deserialize)]
struct SteamGameSchema {
    #[serde(rename = "gameName")]
    game_name: Option<String>,
    #[serde(rename = "gameVersion")]
    game_version: Option<String>,
    #[serde(rename = "availableGameStats")]
    available_game_stats: Option<SteamGameStats>,
}

#[derive(Debug, Deserialize)]
struct SteamGameStats {
    achievements: Option<Vec<SteamAchievementSchema>>,
}

#[derive(Debug, Deserialize)]
struct SteamAchievementSchema {
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    description: Option<String>,
    icon: Option<String>,
    icongray: Option<String>,
    hidden: Option<u8>,
}

/// Steam player achievements response
#[derive(Debug, Deserialize)]
struct SteamPlayerAchievementsResponse {
    playerstats: Option<SteamPlayerStats>,
}

#[derive(Debug, Deserialize)]
struct SteamPlayerStats {
    #[serde(rename = "steamID")]
    steam_id: Option<String>,
    #[serde(rename = "gameName")]
    game_name: Option<String>,
    achievements: Option<Vec<SteamPlayerAchievement>>,
    success: Option<bool>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SteamPlayerAchievement {
    apiname: String,
    achieved: u8,
    unlocktime: Option<i64>,
    name: Option<String>,
    description: Option<String>,
}

/// Achievements service
#[derive(Clone)]
pub struct AchievementsService {
    client: Client,
    steam_api_key: Option<String>,
    steam_id: Option<String>,
}

impl AchievementsService {
    /// Create a new achievements service
    pub fn new(steam_api_key: Option<String>, steam_id: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            steam_api_key,
            steam_id,
        }
    }

    /// Create from environment variables
    pub fn from_env() -> Self {
        let steam_api_key = std::env::var("STEAM_API_KEY").ok();
        let steam_id = std::env::var("STEAM_ID").ok();

        Self::new(steam_api_key, steam_id)
    }

    /// Check if Steam achievements can be fetched
    pub fn can_fetch_steam(&self) -> bool {
        self.steam_api_key.is_some() && self.steam_id.is_some()
    }

    // ===================== STEAM ACHIEVEMENTS =====================

    /// Get achievement schema for a Steam game
    async fn get_steam_schema(&self, app_id: u32) -> Result<Vec<SteamAchievementSchema>> {
        let api_key = self
            .steam_api_key
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Steam API key not configured"))?;

        let url = format!(
            "{}/ISteamUserStats/GetSchemaForGame/v2/?appid={}&key={}",
            STEAM_API_BASE, app_id, api_key
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .context("Failed to fetch Steam schema")?;

        if !response.status().is_success() {
            let status = response.status();
            anyhow::bail!("Steam schema request failed: {}", status);
        }

        let schema: SteamSchemaResponse = response
            .json()
            .await
            .context("Failed to parse Steam schema")?;

        Ok(schema
            .game
            .and_then(|g| g.available_game_stats)
            .and_then(|s| s.achievements)
            .unwrap_or_default())
    }

    /// Get player achievements for a Steam game
    async fn get_steam_player_achievements(
        &self,
        app_id: u32,
    ) -> Result<Vec<SteamPlayerAchievement>> {
        let api_key = self
            .steam_api_key
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Steam API key not configured"))?;
        let steam_id = self
            .steam_id
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Steam ID not configured"))?;

        let url = format!(
            "{}/ISteamUserStats/GetPlayerAchievements/v1/?appid={}&key={}&steamid={}",
            STEAM_API_BASE, app_id, api_key, steam_id
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .context("Failed to fetch Steam player achievements")?;

        if !response.status().is_success() {
            let status = response.status();
            anyhow::bail!("Steam player achievements request failed: {}", status);
        }

        let achievements: SteamPlayerAchievementsResponse = response
            .json()
            .await
            .context("Failed to parse Steam player achievements")?;

        if let Some(stats) = &achievements.playerstats {
            if let Some(error) = &stats.error {
                // Game might not have achievements or profile is private
                log::debug!("Steam achievements error for {}: {}", app_id, error);
                return Ok(vec![]);
            }
        }

        Ok(achievements
            .playerstats
            .and_then(|s| s.achievements)
            .unwrap_or_default())
    }

    /// Get full achievements for a Steam game
    pub async fn get_steam_achievements(&self, app_id: u32) -> Result<Option<GameAchievements>> {
        if !self.can_fetch_steam() {
            return Ok(None);
        }

        // Fetch schema and player achievements in parallel
        let (schema_result, player_result) = tokio::join!(
            self.get_steam_schema(app_id),
            self.get_steam_player_achievements(app_id)
        );

        let schema = schema_result?;
        let player_achievements = player_result?;

        if schema.is_empty() {
            return Ok(None); // Game has no achievements
        }

        // Build achievement map for quick lookup
        let player_map: std::collections::HashMap<&str, &SteamPlayerAchievement> =
            player_achievements
                .iter()
                .map(|a| (a.apiname.as_str(), a))
                .collect();

        let mut achievements = Vec::new();
        let mut unlocked = 0u32;

        for schema_ach in &schema {
            let player_ach = player_map.get(schema_ach.name.as_str());
            let achieved = player_ach.map(|a| a.achieved == 1).unwrap_or(false);

            if achieved {
                unlocked += 1;
            }

            achievements.push(Achievement {
                api_name: schema_ach.name.clone(),
                name: schema_ach.display_name.clone(),
                description: schema_ach.description.clone(),
                achieved,
                unlock_time: player_ach.and_then(|a| a.unlocktime),
                icon_url: schema_ach.icon.clone(),
                icon_gray_url: schema_ach.icongray.clone(),
            });
        }

        Ok(Some(GameAchievements {
            total: schema.len() as u32,
            unlocked,
            achievements,
        }))
    }

    // ===================== CLI-BASED ACHIEVEMENTS =====================

    /// Parse legendary status output for Epic achievements
    pub fn parse_legendary_achievements(output: &str) -> Option<GameAchievements> {
        // legendary status output format varies, but achievements section looks like:
        // Achievements: X/Y unlocked
        // - [✓] Achievement Name - Description
        // - [ ] Other Achievement - Description

        let mut total = 0u32;
        let mut unlocked = 0u32;
        let mut achievements = Vec::new();
        let mut in_achievements_section = false;

        for line in output.lines() {
            let line = line.trim();

            // Check for achievements summary line
            if line.contains("Achievements:") && line.contains("unlocked") {
                if let Some(counts) = Self::parse_achievement_counts(line) {
                    total = counts.0;
                    unlocked = counts.1;
                }
                in_achievements_section = true;
                continue;
            }

            // Parse individual achievements
            if in_achievements_section && line.starts_with("- [") {
                let achieved = line.contains("[✓]") || line.contains("[x]") || line.contains("[X]");

                // Extract name (after the checkbox)
                let name_part = line
                    .trim_start_matches("- [✓]")
                    .trim_start_matches("- [✗]")
                    .trim_start_matches("- [ ]")
                    .trim_start_matches("- [x]")
                    .trim_start_matches("- [X]");

                let (name, description) = if let Some(idx) = name_part.find(" - ") {
                    (name_part[..idx].trim(), Some(name_part[idx + 3..].trim()))
                } else {
                    (name_part.trim(), None)
                };

                achievements.push(Achievement {
                    api_name: name.to_string(),
                    name: name.to_string(),
                    description: description.map(|s| s.to_string()),
                    achieved,
                    unlock_time: None,
                    icon_url: None,
                    icon_gray_url: None,
                });
            }

            // Exit achievements section on empty line or new section
            if in_achievements_section
                && (line.is_empty() || (line.contains(':') && !line.contains("Achievement")))
            {
                if !line.is_empty() {
                    in_achievements_section = false;
                }
            }
        }

        if total > 0 || !achievements.is_empty() {
            // If we parsed individual achievements but not the summary, count them
            if total == 0 && !achievements.is_empty() {
                total = achievements.len() as u32;
                unlocked = achievements.iter().filter(|a| a.achieved).count() as u32;
            }

            Some(GameAchievements {
                total,
                unlocked,
                achievements,
            })
        } else {
            None
        }
    }

    /// Parse achievement counts from a line like "Achievements: 37/63 unlocked"
    fn parse_achievement_counts(line: &str) -> Option<(u32, u32)> {
        // Try to find pattern like "X/Y" or "X of Y"
        let parts: Vec<&str> = line
            .split(|c: char| !c.is_numeric())
            .filter(|s| !s.is_empty())
            .collect();

        if parts.len() >= 2 {
            let unlocked = parts[0].parse().ok()?;
            let total = parts[1].parse().ok()?;
            return Some((total, unlocked));
        }

        None
    }

    /// Parse gogdl status output for GOG achievements
    pub fn parse_gogdl_achievements(output: &str) -> Option<GameAchievements> {
        // Similar format to legendary
        Self::parse_legendary_achievements(output)
    }

    /// Parse nile status output for Amazon achievements
    pub fn parse_nile_achievements(output: &str) -> Option<GameAchievements> {
        // Similar format to legendary
        Self::parse_legendary_achievements(output)
    }

    /// Get achievements from legendary CLI
    pub async fn get_epic_achievements(
        &self,
        store_id: &str,
        legendary_path: &str,
    ) -> Result<Option<GameAchievements>> {
        let output = Command::new(legendary_path)
            .args(["status", store_id])
            .output()
            .context("Failed to run legendary status")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::debug!("legendary status failed: {}", stderr);
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(Self::parse_legendary_achievements(&stdout))
    }

    /// Get achievements from gogdl CLI
    pub async fn get_gog_achievements(
        &self,
        store_id: &str,
        gogdl_path: &str,
    ) -> Result<Option<GameAchievements>> {
        let output = Command::new(gogdl_path)
            .args(["status", store_id])
            .output()
            .context("Failed to run gogdl status")?;

        if !output.status.success() {
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(Self::parse_gogdl_achievements(&stdout))
    }
}

impl Default for AchievementsService {
    fn default() -> Self {
        Self::from_env()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_achievements_completion() {
        let achievements = GameAchievements {
            total: 100,
            unlocked: 50,
            achievements: vec![],
        };

        assert_eq!(achievements.completion_percentage(), 50.0);
    }

    #[test]
    fn test_game_achievements_completion_zero() {
        let achievements = GameAchievements {
            total: 0,
            unlocked: 0,
            achievements: vec![],
        };

        assert_eq!(achievements.completion_percentage(), 0.0);
    }

    #[test]
    fn test_parse_achievement_counts() {
        assert_eq!(
            AchievementsService::parse_achievement_counts("Achievements: 37/63 unlocked"),
            Some((63, 37))
        );

        assert_eq!(
            AchievementsService::parse_achievement_counts("10/20"),
            Some((20, 10))
        );
    }

    #[test]
    fn test_parse_legendary_achievements() {
        let output = r#"
Game Status: Hollow Knight
Version: 1.5.0.0
Installed: Yes

Achievements: 37/63 unlocked
- [✓] Completion - Complete the game
- [✓] Speedrun - Complete in under 5 hours
- [ ] 100% - Achieve 100% completion
- [x] Another - With description - This is a description
"#;

        let result = AchievementsService::parse_legendary_achievements(output);
        assert!(result.is_some());

        let achievements = result.unwrap();
        assert_eq!(achievements.total, 63);
        assert_eq!(achievements.unlocked, 37);
        assert_eq!(achievements.achievements.len(), 4);

        // Check individual achievements
        assert!(achievements.achievements[0].achieved);
        assert_eq!(achievements.achievements[0].name, "Completion");

        assert!(achievements.achievements[1].achieved);

        assert!(!achievements.achievements[2].achieved);
        assert_eq!(achievements.achievements[2].name, "100%");

        assert!(achievements.achievements[3].achieved);
    }

    #[test]
    fn test_parse_legendary_no_achievements() {
        let output = "Game Status: Some Game\nNo achievements available\n";

        let result = AchievementsService::parse_legendary_achievements(output);
        assert!(result.is_none());
    }

    #[test]
    fn test_can_fetch_steam() {
        let service =
            AchievementsService::new(Some("api_key".to_string()), Some("steam_id".to_string()));
        assert!(service.can_fetch_steam());

        let service_no_key = AchievementsService::new(None, Some("steam_id".to_string()));
        assert!(!service_no_key.can_fetch_steam());

        let service_no_id = AchievementsService::new(Some("api_key".to_string()), None);
        assert!(!service_no_id.can_fetch_steam());
    }
}

// ===================== INTEGRATION TESTS =====================

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn get_service() -> Option<AchievementsService> {
        let service = AchievementsService::from_env();
        if service.can_fetch_steam() {
            Some(service)
        } else {
            None
        }
    }

    #[tokio::test]
    #[ignore = "Requires STEAM_API_KEY and STEAM_ID"]
    async fn test_get_steam_achievements() {
        let service = get_service().expect("Steam credentials required");

        // Hollow Knight
        let result = service.get_steam_achievements(367520).await;
        assert!(result.is_ok(), "Request failed: {:?}", result.err());

        let achievements = result.unwrap();
        if let Some(achievements) = achievements {
            println!(
                "Hollow Knight achievements: {}/{}",
                achievements.unlocked, achievements.total
            );
            println!("Completion: {:.1}%", achievements.completion_percentage());

            // Print first few achievements
            for ach in achievements.achievements.iter().take(5) {
                println!(
                    "  [{}] {} - {:?}",
                    if ach.achieved { "✓" } else { " " },
                    ach.name,
                    ach.description
                );
            }
        } else {
            println!(
                "No achievements found (game may not have achievements or profile is private)"
            );
        }
    }

    #[tokio::test]
    #[ignore = "Requires STEAM_API_KEY and STEAM_ID"]
    async fn test_get_steam_schema() {
        let service = get_service().expect("Steam credentials required");

        // Hollow Knight
        let result = service.get_steam_schema(367520).await;
        assert!(result.is_ok(), "Request failed: {:?}", result.err());

        let schema = result.unwrap();
        println!("Hollow Knight has {} achievements defined", schema.len());

        // Print first few
        for ach in schema.iter().take(3) {
            println!("  {} - {:?}", ach.display_name, ach.description);
        }
    }
}
