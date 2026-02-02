//! IGDB API Service for fetching game metadata
//!
//! API Documentation: https://api-docs.igdb.com/
//!
//! Provides:
//! - Game search by name
//! - Game metadata (description, rating, release date)
//! - Developer/Publisher information
//! - Genres
//! - External game IDs (Steam, Epic, GOG)

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const IGDB_API_BASE: &str = "https://api.igdb.com/v4";
const TWITCH_AUTH_URL: &str = "https://id.twitch.tv/oauth2/token";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// IGDB external game category IDs
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExternalCategory {
    Steam = 1,
    Gog = 5,
    Epic = 26,
    Amazon = 20,
}

impl ExternalCategory {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            1 => Some(Self::Steam),
            5 => Some(Self::Gog),
            26 => Some(Self::Epic),
            20 => Some(Self::Amazon),
            _ => None,
        }
    }
}

/// Twitch OAuth token response
#[derive(Debug, Deserialize)]
struct TwitchTokenResponse {
    access_token: String,
    expires_in: u64,
    #[allow(dead_code)]
    token_type: String,
}

/// IGDB Game response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBGame {
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
    pub platforms: Option<Vec<IGDBPlatform>>,
    pub cover: Option<IGDBCover>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBGenre {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBInvolvedCompany {
    pub id: u64,
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
    pub id: u64,
    pub category: u8,
    pub uid: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBPlatform {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBCover {
    pub id: u64,
    pub url: Option<String>,
    pub image_id: Option<String>,
}

/// Parsed game metadata from IGDB
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IGDBMetadata {
    pub igdb_id: u64,
    pub name: String,
    pub description: Option<String>,
    pub summary: Option<String>,
    pub rating: Option<f32>,
    pub aggregated_rating: Option<f32>,
    pub release_date: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genres: Vec<String>,
    pub steam_app_id: Option<u32>,
    pub epic_store_id: Option<String>,
    pub gog_id: Option<String>,
    pub cover_url: Option<String>,
}

/// IGDB API Service
#[derive(Clone)]
pub struct IGDBService {
    client: Client,
    client_id: String,
    client_secret: String,
    access_token: Option<String>,
}

impl IGDBService {
    /// Create a new IGDB service
    pub fn new(client_id: String, client_secret: String) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            client_id,
            client_secret,
            access_token: None,
        }
    }

    /// Create from environment variables
    pub fn from_env() -> Result<Self> {
        let client_id =
            std::env::var("IGDB_CLIENT_ID").context("IGDB_CLIENT_ID not set in environment")?;
        let client_secret = std::env::var("IGDB_CLIENT_SECRET")
            .context("IGDB_CLIENT_SECRET not set in environment")?;

        Ok(Self::new(client_id, client_secret))
    }

    /// Authenticate with Twitch to get IGDB access token
    pub async fn authenticate(&mut self) -> Result<()> {
        let url = format!(
            "{}?client_id={}&client_secret={}&grant_type=client_credentials",
            TWITCH_AUTH_URL, self.client_id, self.client_secret
        );

        let response = self
            .client
            .post(&url)
            .send()
            .await
            .context("Failed to authenticate with Twitch")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Twitch authentication failed ({}): {}", status, body);
        }

        let token_response: TwitchTokenResponse = response
            .json()
            .await
            .context("Failed to parse Twitch token response")?;

        self.access_token = Some(token_response.access_token);
        log::debug!(
            "IGDB authenticated, token expires in {} seconds",
            token_response.expires_in
        );

        Ok(())
    }

    /// Ensure we have a valid access token
    async fn ensure_authenticated(&mut self) -> Result<()> {
        if self.access_token.is_none() {
            self.authenticate().await?;
        }
        Ok(())
    }

    /// Get the access token, authenticating if needed
    fn get_token(&self) -> Result<&str> {
        self.access_token
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("Not authenticated with IGDB"))
    }

    /// Execute an IGDB API query
    async fn query(&mut self, endpoint: &str, body: &str) -> Result<String> {
        self.ensure_authenticated().await?;

        let url = format!("{}/{}", IGDB_API_BASE, endpoint);

        let response = self
            .client
            .post(&url)
            .header("Client-ID", &self.client_id)
            .header("Authorization", format!("Bearer {}", self.get_token()?))
            .body(body.to_string())
            .send()
            .await
            .context(format!("Failed to query IGDB {}", endpoint))?;

        if response.status() == reqwest::StatusCode::UNAUTHORIZED {
            // Token expired, re-authenticate
            self.access_token = None;
            self.ensure_authenticated().await?;

            // Retry
            let response = self
                .client
                .post(&url)
                .header("Client-ID", &self.client_id)
                .header("Authorization", format!("Bearer {}", self.get_token()?))
                .body(body.to_string())
                .send()
                .await?;

            return response.text().await.context("Failed to read response");
        }

        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            anyhow::bail!("IGDB rate limit exceeded");
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("IGDB query failed ({}): {}", status, body);
        }

        response.text().await.context("Failed to read response")
    }

    /// Search for a game by name
    pub async fn search_game(&mut self, name: &str) -> Result<Option<IGDBGame>> {
        let escaped_name = name.replace("\"", "\\\"");
        let body = format!(
            r#"search "{}";
fields name, summary, storyline, rating, aggregated_rating, first_release_date,
       genres.name, involved_companies.company.name, involved_companies.developer,
       involved_companies.publisher, external_games.category, external_games.uid,
       platforms.name, cover.url, cover.image_id;
limit 1;"#,
            escaped_name
        );

        let response = self.query("games", &body).await?;
        let games: Vec<IGDBGame> =
            serde_json::from_str(&response).context("Failed to parse IGDB search response")?;

        Ok(games.into_iter().next())
    }

    /// Parse IGDB game to metadata
    pub fn parse_metadata(&self, game: &IGDBGame) -> IGDBMetadata {
        // Extract developer and publisher
        let (developer, publisher) = game
            .involved_companies
            .as_ref()
            .map(|companies| {
                let dev = companies
                    .iter()
                    .find(|c| c.developer == Some(true))
                    .and_then(|c| c.company.as_ref())
                    .map(|c| c.name.clone());

                let pub_ = companies
                    .iter()
                    .find(|c| c.publisher == Some(true))
                    .and_then(|c| c.company.as_ref())
                    .map(|c| c.name.clone());

                (dev, pub_)
            })
            .unwrap_or((None, None));

        // Extract genres
        let genres = game
            .genres
            .as_ref()
            .map(|g| g.iter().map(|genre| genre.name.clone()).collect())
            .unwrap_or_default();

        // Extract external IDs
        let (steam_app_id, epic_store_id, gog_id) = game
            .external_games
            .as_ref()
            .map(|externals| {
                let steam = externals
                    .iter()
                    .find(|e| {
                        ExternalCategory::from_u8(e.category) == Some(ExternalCategory::Steam)
                    })
                    .and_then(|e| e.uid.parse().ok());

                let epic = externals
                    .iter()
                    .find(|e| ExternalCategory::from_u8(e.category) == Some(ExternalCategory::Epic))
                    .map(|e| e.uid.clone());

                let gog = externals
                    .iter()
                    .find(|e| ExternalCategory::from_u8(e.category) == Some(ExternalCategory::Gog))
                    .map(|e| e.uid.clone());

                (steam, epic, gog)
            })
            .unwrap_or((None, None, None));

        // Format release date
        let release_date = game.first_release_date.and_then(|ts| {
            chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.format("%Y-%m-%d").to_string())
        });

        // Build cover URL
        let cover_url = game
            .cover
            .as_ref()
            .and_then(|c| c.image_id.as_ref())
            .map(|id| {
                format!(
                    "https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg",
                    id
                )
            });

        IGDBMetadata {
            igdb_id: game.id,
            name: game.name.clone(),
            description: game.storyline.clone(),
            summary: game.summary.clone(),
            rating: game.rating.map(|r| r as f32),
            aggregated_rating: game.aggregated_rating.map(|r| r as f32),
            release_date,
            developer,
            publisher,
            genres,
            steam_app_id,
            epic_store_id,
            gog_id,
            cover_url,
        }
    }

    /// Search for a game and return parsed metadata
    pub async fn fetch_metadata(&mut self, name: &str) -> Result<Option<IGDBMetadata>> {
        let game = self.search_game(name).await?;
        Ok(game.map(|g| self.parse_metadata(&g)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_external_category() {
        assert_eq!(ExternalCategory::from_u8(1), Some(ExternalCategory::Steam));
        assert_eq!(ExternalCategory::from_u8(5), Some(ExternalCategory::Gog));
        assert_eq!(ExternalCategory::from_u8(26), Some(ExternalCategory::Epic));
        assert_eq!(ExternalCategory::from_u8(99), None);
    }

    #[test]
    fn test_parse_metadata() {
        let service = IGDBService::new("test".to_string(), "test".to_string());

        let game = IGDBGame {
            id: 1234,
            name: "Test Game".to_string(),
            summary: Some("A test game".to_string()),
            storyline: Some("Full storyline".to_string()),
            rating: Some(85.5),
            aggregated_rating: Some(90.0),
            first_release_date: Some(1609459200), // 2021-01-01
            genres: Some(vec![
                IGDBGenre {
                    id: 1,
                    name: "Action".to_string(),
                },
                IGDBGenre {
                    id: 2,
                    name: "Adventure".to_string(),
                },
            ]),
            involved_companies: Some(vec![
                IGDBInvolvedCompany {
                    id: 1,
                    company: Some(IGDBCompany {
                        id: 1,
                        name: "Dev Studio".to_string(),
                    }),
                    developer: Some(true),
                    publisher: Some(false),
                },
                IGDBInvolvedCompany {
                    id: 2,
                    company: Some(IGDBCompany {
                        id: 2,
                        name: "Publisher Inc".to_string(),
                    }),
                    developer: Some(false),
                    publisher: Some(true),
                },
            ]),
            external_games: Some(vec![IGDBExternalGame {
                id: 1,
                category: 1,
                uid: "123456".to_string(),
            }]),
            platforms: None,
            cover: Some(IGDBCover {
                id: 1,
                url: None,
                image_id: Some("abc123".to_string()),
            }),
        };

        let metadata = service.parse_metadata(&game);

        assert_eq!(metadata.igdb_id, 1234);
        assert_eq!(metadata.name, "Test Game");
        assert_eq!(metadata.developer, Some("Dev Studio".to_string()));
        assert_eq!(metadata.publisher, Some("Publisher Inc".to_string()));
        assert_eq!(metadata.genres, vec!["Action", "Adventure"]);
        assert_eq!(metadata.steam_app_id, Some(123456));
        assert!(metadata.cover_url.is_some());
        assert_eq!(metadata.rating, Some(85.5));
    }
}

// ===================== INTEGRATION TESTS =====================

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn get_service() -> Option<IGDBService> {
        IGDBService::from_env().ok()
    }

    #[tokio::test]
    #[ignore = "Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET"]
    async fn test_authentication() {
        let mut service = get_service().expect("IGDB credentials required");

        let result = service.authenticate().await;
        assert!(result.is_ok(), "Authentication failed: {:?}", result.err());
    }

    #[tokio::test]
    #[ignore = "Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET"]
    async fn test_search_game_success() {
        let mut service = get_service().expect("IGDB credentials required");

        let result = service.search_game("Hollow Knight").await;
        assert!(result.is_ok(), "Search failed: {:?}", result.err());

        let game = result.unwrap();
        assert!(game.is_some(), "Game not found");

        let game = game.unwrap();
        println!("Found: {} (ID: {})", game.name, game.id);
        assert!(game.name.to_lowercase().contains("hollow knight"));
    }

    #[tokio::test]
    #[ignore = "Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET"]
    async fn test_search_game_not_found() {
        let mut service = get_service().expect("IGDB credentials required");

        let result = service
            .search_game("ThisGameDefinitelyDoesNotExist12345XYZ")
            .await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    #[ignore = "Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET"]
    async fn test_fetch_metadata() {
        let mut service = get_service().expect("IGDB credentials required");

        let result = service.fetch_metadata("Hollow Knight").await;
        assert!(result.is_ok(), "Fetch failed: {:?}", result.err());

        let metadata = result.unwrap();
        assert!(metadata.is_some(), "Metadata not found");

        let metadata = metadata.unwrap();
        println!("Metadata for {}:", metadata.name);
        println!("  Developer: {:?}", metadata.developer);
        println!("  Publisher: {:?}", metadata.publisher);
        println!("  Genres: {:?}", metadata.genres);
        println!("  Rating: {:?}", metadata.rating);
        println!("  Release date: {:?}", metadata.release_date);
        println!("  Steam ID: {:?}", metadata.steam_app_id);
    }

    // Note: test_get_by_steam_id removed - method was migrated to TypeScript
}
