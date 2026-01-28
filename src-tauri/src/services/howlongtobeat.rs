//! HowLongToBeat Service for fetching game duration estimates
//!
//! Note: HowLongToBeat doesn't have an official API.
//! This implementation uses web scraping of their search results.
//!
//! Provides:
//! - Main story completion time
//! - Main story + extras time
//! - Completionist (100%) time
//! - Speedrun time (if available)

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const HLTB_BASE_URL: &str = "https://howlongtobeat.com";
const HLTB_SEARCH_URL: &str = "https://howlongtobeat.com/api/search";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// HowLongToBeat game result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HLTBGame {
    pub game_id: u64,
    pub game_name: String,
    pub game_image: Option<String>,
    pub comp_main: Option<f32>,       // Main story hours
    pub comp_plus: Option<f32>,       // Main + extras hours
    pub comp_100: Option<f32>,        // 100% completion hours
    pub comp_all: Option<f32>,        // All styles average
    pub comp_main_count: Option<u32>, // Number of reports for main
    pub comp_plus_count: Option<u32>,
    pub comp_100_count: Option<u32>,
}

/// Simplified result for caching
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HLTBDurations {
    pub game_id: Option<u64>,
    pub game_name: Option<String>,
    pub main_story: Option<u32>,    // hours
    pub main_extra: Option<u32>,    // hours
    pub completionist: Option<u32>, // hours
    pub speedrun: Option<u32>,      // hours (if available)
}

/// Search request payload (mimics the website's API)
#[derive(Debug, Serialize)]
struct HLTBSearchRequest {
    #[serde(rename = "searchType")]
    search_type: String,
    #[serde(rename = "searchTerms")]
    search_terms: Vec<String>,
    #[serde(rename = "searchPage")]
    search_page: u32,
    size: u32,
    #[serde(rename = "searchOptions")]
    search_options: HLTBSearchOptions,
}

#[derive(Debug, Serialize)]
struct HLTBSearchOptions {
    games: HLTBGameOptions,
    users: HLTBUserOptions,
    filter: String,
    sort: u32,
    randomizer: u32,
}

#[derive(Debug, Serialize)]
#[allow(non_snake_case)]
struct HLTBGameOptions {
    userId: u32,
    platform: String,
    sortCategory: String,
    rangeCategory: String,
    rangeTime: HLTBRangeTime,
    gameplay: HLTBGameplay,
    rangeYear: HLTBRangeYear,
    modifier: String,
}

#[derive(Debug, Serialize)]
struct HLTBRangeTime {
    min: Option<u32>,
    max: Option<u32>,
}

#[derive(Debug, Serialize)]
struct HLTBGameplay {
    perspective: String,
    flow: String,
    genre: String,
}

#[derive(Debug, Serialize)]
struct HLTBRangeYear {
    min: String,
    max: String,
}

#[derive(Debug, Serialize)]
#[allow(non_snake_case)]
struct HLTBUserOptions {
    sortCategory: String,
}

/// Search response
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
struct HLTBSearchResponse {
    color: Option<String>,
    title: Option<String>,
    category: Option<String>,
    count: Option<u32>,
    pageCurrent: Option<u32>,
    pageTotal: Option<u32>,
    pageSize: Option<u32>,
    data: Vec<HLTBGameData>,
}

#[derive(Debug, Deserialize)]
struct HLTBGameData {
    game_id: u64,
    game_name: String,
    game_image: Option<String>,
    comp_main: Option<f64>,
    comp_plus: Option<f64>,
    comp_100: Option<f64>,
    comp_all: Option<f64>,
    comp_main_count: Option<u32>,
    comp_plus_count: Option<u32>,
    comp_100_count: Option<u32>,
    invested_co: Option<u32>,
    invested_mp: Option<u32>,
    count_comp: Option<u32>,
    count_speedrun: Option<u32>,
    count_backlog: Option<u32>,
    count_review: Option<u32>,
    review_score: Option<u32>,
    count_playing: Option<u32>,
    count_retired: Option<u32>,
    profile_dev: Option<String>,
    profile_popular: Option<u32>,
    profile_steam: Option<u32>,
    profile_platform: Option<String>,
    release_world: Option<u32>,
}

/// HowLongToBeat service
#[derive(Clone)]
pub struct HowLongToBeatService {
    client: Client,
}

impl HowLongToBeatService {
    /// Create a new HLTB service
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    /// Search for a game by name
    pub async fn search(&self, name: &str) -> Result<Vec<HLTBGame>> {
        let request = HLTBSearchRequest {
            search_type: "games".to_string(),
            search_terms: name.split_whitespace().map(|s| s.to_string()).collect(),
            search_page: 1,
            size: 20,
            search_options: HLTBSearchOptions {
                games: HLTBGameOptions {
                    userId: 0,
                    platform: "".to_string(),
                    sortCategory: "popular".to_string(),
                    rangeCategory: "main".to_string(),
                    rangeTime: HLTBRangeTime {
                        min: None,
                        max: None,
                    },
                    gameplay: HLTBGameplay {
                        perspective: "".to_string(),
                        flow: "".to_string(),
                        genre: "".to_string(),
                    },
                    rangeYear: HLTBRangeYear {
                        min: "".to_string(),
                        max: "".to_string(),
                    },
                    modifier: "".to_string(),
                },
                users: HLTBUserOptions {
                    sortCategory: "postcount".to_string(),
                },
                filter: "".to_string(),
                sort: 0,
                randomizer: 0,
            },
        };

        let response = self
            .client
            .post(HLTB_SEARCH_URL)
            .header(
                "User-Agent",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            )
            .header("Referer", HLTB_BASE_URL)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Failed to send HLTB search request")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            log::warn!("HLTB search failed ({}): {}", status, body);
            anyhow::bail!("HLTB search failed with status: {}", status);
        }

        let result: HLTBSearchResponse = response
            .json()
            .await
            .context("Failed to parse HLTB response")?;

        let games: Vec<HLTBGame> = result
            .data
            .into_iter()
            .map(|g| HLTBGame {
                game_id: g.game_id,
                game_name: g.game_name,
                game_image: g
                    .game_image
                    .map(|img| format!("{}/games/{}", HLTB_BASE_URL, img)),
                comp_main: g.comp_main.map(|h| h as f32 / 3600.0),
                comp_plus: g.comp_plus.map(|h| h as f32 / 3600.0),
                comp_100: g.comp_100.map(|h| h as f32 / 3600.0),
                comp_all: g.comp_all.map(|h| h as f32 / 3600.0),
                comp_main_count: g.comp_main_count,
                comp_plus_count: g.comp_plus_count,
                comp_100_count: g.comp_100_count,
            })
            .collect();

        Ok(games)
    }

    /// Search for a game and return the best match
    pub async fn search_one(&self, name: &str) -> Result<Option<HLTBGame>> {
        let games = self.search(name).await?;

        // Find best match by name similarity
        let search_lower = name.to_lowercase();

        let best = games
            .into_iter()
            .find(|g| {
                let game_lower = g.game_name.to_lowercase();
                game_lower == search_lower
                    || game_lower.contains(&search_lower)
                    || search_lower.contains(&game_lower)
            })
            .or_else(|| None);

        Ok(best)
    }

    /// Get durations for a game by name
    pub async fn get_durations(&self, name: &str) -> Result<Option<HLTBDurations>> {
        let game = self.search_one(name).await?;

        Ok(game.map(|g| HLTBDurations {
            game_id: Some(g.game_id),
            game_name: Some(g.game_name),
            main_story: g.comp_main.map(|h| h.round() as u32),
            main_extra: g.comp_plus.map(|h| h.round() as u32),
            completionist: g.comp_100.map(|h| h.round() as u32),
            speedrun: None, // HLTB doesn't provide speedrun in search, would need separate lookup
        }))
    }

    /// Parse hours from string (handles various formats)
    fn parse_hours(text: &str) -> Option<f32> {
        let cleaned = text
            .trim()
            .replace("½", ".5")
            .replace("¼", ".25")
            .replace("¾", ".75");

        // Handle "XX Hours" format
        if let Some(hours_str) = cleaned.strip_suffix(" Hours") {
            return hours_str.trim().parse().ok();
        }

        // Handle "XX Mins" format
        if let Some(mins_str) = cleaned.strip_suffix(" Mins") {
            return mins_str.trim().parse::<f32>().ok().map(|m| m / 60.0);
        }

        // Handle plain number
        cleaned.parse().ok()
    }
}

impl Default for HowLongToBeatService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hours() {
        assert_eq!(HowLongToBeatService::parse_hours("10 Hours"), Some(10.0));
        assert_eq!(HowLongToBeatService::parse_hours("10.5 Hours"), Some(10.5));
        assert_eq!(HowLongToBeatService::parse_hours("30 Mins"), Some(0.5));
        assert_eq!(HowLongToBeatService::parse_hours("10½ Hours"), Some(10.5));
        assert_eq!(HowLongToBeatService::parse_hours("invalid"), None);
    }

    #[test]
    fn test_hltb_durations_default() {
        let durations = HLTBDurations::default();
        assert!(durations.game_id.is_none());
        assert!(durations.main_story.is_none());
    }
}

// ===================== INTEGRATION TESTS =====================

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    #[ignore = "Requires network access, may be rate limited"]
    async fn test_search_success() {
        let service = HowLongToBeatService::new();

        let result = service.search("Hollow Knight").await;
        assert!(result.is_ok(), "Search failed: {:?}", result.err());

        let games = result.unwrap();
        assert!(!games.is_empty(), "No games found");

        let first = &games[0];
        println!("Found: {} (ID: {})", first.game_name, first.game_id);
        println!("  Main: {:?}h", first.comp_main);
        println!("  Main+Extra: {:?}h", first.comp_plus);
        println!("  100%: {:?}h", first.comp_100);
    }

    #[tokio::test]
    #[ignore = "Requires network access, may be rate limited"]
    async fn test_search_one() {
        let service = HowLongToBeatService::new();

        let result = service.search_one("Hollow Knight").await;
        assert!(result.is_ok(), "Search failed: {:?}", result.err());

        let game = result.unwrap();
        assert!(game.is_some(), "Game not found");

        let game = game.unwrap();
        assert!(game.game_name.to_lowercase().contains("hollow knight"));
    }

    #[tokio::test]
    #[ignore = "Requires network access, may be rate limited"]
    async fn test_get_durations() {
        let service = HowLongToBeatService::new();

        let result = service.get_durations("Hollow Knight").await;
        assert!(result.is_ok(), "Get durations failed: {:?}", result.err());

        let durations = result.unwrap();
        assert!(durations.is_some(), "Durations not found");

        let durations = durations.unwrap();
        println!("Durations for {:?}:", durations.game_name);
        println!("  Main story: {:?}h", durations.main_story);
        println!("  Main + extras: {:?}h", durations.main_extra);
        println!("  Completionist: {:?}h", durations.completionist);

        // Hollow Knight typically has ~25h main story
        if let Some(main) = durations.main_story {
            assert!(
                main > 10 && main < 100,
                "Unexpected main story duration: {}",
                main
            );
        }
    }

    #[tokio::test]
    #[ignore = "Requires network access, may be rate limited"]
    async fn test_search_not_found() {
        let service = HowLongToBeatService::new();

        let result = service
            .search("ThisGameDefinitelyDoesNotExist12345XYZ")
            .await;
        assert!(result.is_ok());

        let games = result.unwrap();
        assert!(
            games.is_empty()
                || !games[0]
                    .game_name
                    .to_lowercase()
                    .contains("thisgamedefinitely")
        );
    }
}
