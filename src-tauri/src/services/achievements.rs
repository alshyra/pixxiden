//! Achievements Service for fetching game achievements
//!
//! Supports:
//! - Steam Web API for Steam achievements
//! - Parsing legendary/gogdl/nile CLI output for Epic/GOG/Amazon achievements

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
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

// TODO: completion_percentage() removed - calculate in TypeScript if needed

/// Steam achievement schema response
#[derive(Debug, Deserialize)]
struct SteamSchemaResponse {
    game: Option<SteamGameSchema>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
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
#[allow(dead_code)]
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
#[allow(dead_code)]
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
#[allow(dead_code)]
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

    // TODO: CLI-based achievements (parse_legendary_achievements, parse_gogdl_achievements)
    // have been migrated to TypeScript services
}

impl Default for AchievementsService {
    fn default() -> Self {
        Self::from_env()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: test_game_achievements_completion removed - completion_percentage was migrated to TypeScript

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
            // Note: completion_percentage() removed - calculation moved to TypeScript
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
