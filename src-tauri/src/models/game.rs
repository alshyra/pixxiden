//! Game model with enriched metadata
//!
//! This module defines the unified Game struct that combines data from:
//! - Store adapters (legendary/gogdl/nile)
//! - IGDB (metadata, scores, descriptions)
//! - SteamGridDB (visual assets)
//! - HowLongToBeat (game durations)
//! - ProtonDB (Linux compatibility)
//! - Achievement systems (Steam API, store CLIs)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Unified Game struct with all enriched metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnrichedGame {
    // === Base info (from legendary/gogdl/nile) ===
    pub id: String,
    pub title: String,
    pub store: String,
    pub store_id: String,
    pub installed: bool,
    pub install_path: Option<String>,
    pub wine_prefix: Option<String>,
    pub wine_version: Option<String>,

    // === Metadata (from IGDB) ===
    pub description: Option<String>,
    pub metacritic_score: Option<u8>,
    pub igdb_rating: Option<f32>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genres: Vec<String>,
    pub release_date: Option<String>,
    pub summary: Option<String>,

    // === Playtime (from HowLongToBeat) ===
    pub hltb_main: Option<u32>,       // hours for main story
    pub hltb_main_extra: Option<u32>, // hours for main + extras
    pub hltb_complete: Option<u32>,   // hours for 100% completion
    pub hltb_speedrun: Option<u32>,   // hours for speedrun (any%)

    // === Compatibility (from ProtonDB) ===
    pub proton_tier: Option<String>, // "platinum", "gold", "silver", "bronze", "borked"
    pub proton_confidence: Option<String>, // "good", "adequate", "low"
    pub proton_trending_tier: Option<String>, // trending tier
    pub steam_app_id: Option<u32>,   // Steam app ID for ProtonDB lookup

    // === Achievements ===
    pub achievements_total: Option<u32>,
    pub achievements_unlocked: Option<u32>,

    // === Assets (local file paths) ===
    pub hero_path: Option<String>,
    pub grid_path: Option<String>,
    pub logo_path: Option<String>,
    pub icon_path: Option<String>,

    // === Legacy URL assets (for backwards compatibility) ===
    pub cover_url: Option<String>,
    pub background_url: Option<String>,

    // === User data ===
    pub play_time_minutes: i64,
    pub last_played: Option<DateTime<Utc>>,

    // === Timestamps ===
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // === Cache metadata ===
    pub enriched_at: Option<DateTime<Utc>>,
}

/// Metadata structure for caching (stored in metadata.json)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameMetadata {
    pub game_id: String,

    // IGDB data
    pub igdb_id: Option<u64>,
    pub description: Option<String>,
    pub summary: Option<String>,
    pub metacritic_score: Option<u8>,
    pub igdb_rating: Option<f32>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genres: Vec<String>,
    pub release_date: Option<String>,

    // HowLongToBeat data
    pub hltb_id: Option<u64>,
    pub hltb_main: Option<u32>,
    pub hltb_main_extra: Option<u32>,
    pub hltb_complete: Option<u32>,
    pub hltb_speedrun: Option<u32>,

    // ProtonDB data
    pub steam_app_id: Option<u32>,
    pub proton_tier: Option<String>,
    pub proton_confidence: Option<String>,
    pub proton_trending_tier: Option<String>,

    // Achievements
    pub achievements_total: Option<u32>,
    pub achievements_unlocked: Option<u32>,

    // Asset paths (relative to cache dir)
    pub hero_path: Option<String>,
    pub grid_path: Option<String>,
    pub logo_path: Option<String>,
    pub icon_path: Option<String>,

    // Timestamps
    pub fetched_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
}

/// ProtonDB tier enum for type safety
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum ProtonTier {
    Platinum,
    Gold,
    Silver,
    Bronze,
    Borked,
    Pending,
}

impl ProtonTier {
    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "platinum" => Some(Self::Platinum),
            "gold" => Some(Self::Gold),
            "silver" => Some(Self::Silver),
            "bronze" => Some(Self::Bronze),
            "borked" => Some(Self::Borked),
            "pending" => Some(Self::Pending),
            _ => None,
        }
    }

    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Platinum => "platinum",
            Self::Gold => "gold",
            Self::Silver => "silver",
            Self::Bronze => "bronze",
            Self::Borked => "borked",
            Self::Pending => "pending",
        }
    }
}

/// IGDB search result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct IGDBGameResult {
    pub id: u64,
    pub name: String,
    pub summary: Option<String>,
    pub storyline: Option<String>,
    pub rating: Option<f64>,
    pub aggregated_rating: Option<f64>,
    pub first_release_date: Option<i64>,
    pub genres: Option<Vec<IGDBGenre>>,
    pub involved_companies: Option<Vec<IGDBInvolvedCompany>>,
    pub external_games: Option<Vec<IGDBExternalGame>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBGenre {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBInvolvedCompany {
    pub company: Option<IGDBCompany>,
    pub developer: Option<bool>,
    pub publisher: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBCompany {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBExternalGame {
    pub category: u8,
    pub uid: String,
}

/// SteamGridDB search result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SteamGridDBGame {
    pub id: u64,
    pub name: String,
    pub verified: bool,
}

/// HowLongToBeat search result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct HLTBResult {
    pub game_id: u64,
    pub game_name: String,
    pub main_story: Option<f32>,    // hours
    pub main_extra: Option<f32>,    // hours
    pub completionist: Option<f32>, // hours
    pub speedrun_any: Option<f32>,  // hours
}

/// ProtonDB compatibility report
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ProtonDBReport {
    pub tier: String,
    pub confidence: String,
    pub score: Option<f64>,
    pub trending_tier: Option<String>,
    pub best_reported_tier: Option<String>,
}

/// Steam achievements data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SteamAchievements {
    pub total: u32,
    pub unlocked: u32,
    pub achievements: Vec<SteamAchievement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SteamAchievement {
    pub api_name: String,
    pub name: String,
    pub description: Option<String>,
    pub achieved: bool,
    pub unlock_time: Option<i64>,
    pub icon_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proton_tier_from_str() {
        assert_eq!(ProtonTier::from_str("platinum"), Some(ProtonTier::Platinum));
        assert_eq!(ProtonTier::from_str("GOLD"), Some(ProtonTier::Gold));
        assert_eq!(ProtonTier::from_str("Silver"), Some(ProtonTier::Silver));
        assert_eq!(ProtonTier::from_str("unknown"), None);
    }

    #[test]
    fn test_proton_tier_as_str() {
        assert_eq!(ProtonTier::Platinum.as_str(), "platinum");
        assert_eq!(ProtonTier::Borked.as_str(), "borked");
    }
}
