//! SteamGridDB Service for fetching game visual assets
//!
//! API Documentation: https://www.steamgriddb.com/api/v2
//!
//! Provides:
//! - Game search by name
//! - Hero images (1920x620 banner)
//! - Grid images (600x900 cover art)
//! - Logo images (transparent logo)
//! - Icon images (app icon)

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const STEAMGRIDDB_API_BASE: &str = "https://www.steamgriddb.com/api/v2";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// SteamGridDB API response wrapper
#[derive(Debug, Clone, Deserialize)]
pub struct SteamGridDBResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub errors: Option<Vec<String>>,
}

/// Game search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamGridDBGame {
    pub id: u64,
    pub name: String,
    pub verified: bool,
    pub release_date: Option<i64>,
}

/// Image result from grids/heroes/logos/icons endpoints
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamGridDBImage {
    pub id: u64,
    pub score: i32,
    pub style: String,
    pub url: String,
    pub thumb: String,
    pub width: u32,
    pub height: u32,
    pub mime: String,
    #[serde(default)]
    pub nsfw: bool,
    #[serde(default)]
    pub humor: bool,
}

/// Image style preferences
#[derive(Debug, Clone, Copy)]
pub enum GridStyle {
    Alternate,
    Blurred,
    WhiteLogo,
    Material,
    NoLogo,
}

impl GridStyle {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Alternate => "alternate",
            Self::Blurred => "blurred",
            Self::WhiteLogo => "white_logo",
            Self::Material => "material",
            Self::NoLogo => "no_logo",
        }
    }
}

/// SteamGridDB service
#[derive(Clone)]
pub struct SteamGridDBService {
    client: Client,
    api_key: String,
}

impl SteamGridDBService {
    /// Create a new SteamGridDB service
    pub fn new(api_key: String) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");
        
        Self { client, api_key }
    }
    
    /// Create from environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = std::env::var("STEAMGRIDDB_API_KEY")
            .context("STEAMGRIDDB_API_KEY not set in environment")?;
        
        Ok(Self::new(api_key))
    }
    
    /// Build authorization header
    fn auth_header(&self) -> String {
        format!("Bearer {}", self.api_key)
    }
    
    /// Search for a game by name
    pub async fn search_game(&self, name: &str) -> Result<Option<SteamGridDBGame>> {
        let url = format!("{}/search/autocomplete/{}", STEAMGRIDDB_API_BASE, urlencoding::encode(name));
        
        let response = self.client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .context("Failed to send search request")?;
        
        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            anyhow::bail!("SteamGridDB rate limit exceeded");
        }
        
        let data: SteamGridDBResponse<Vec<SteamGridDBGame>> = response
            .json()
            .await
            .context("Failed to parse search response")?;
        
        if !data.success {
            if let Some(errors) = data.errors {
                anyhow::bail!("SteamGridDB search failed: {}", errors.join(", "));
            }
            return Ok(None);
        }
        
        // Return the best match (first result, preferring verified)
        Ok(data.data.and_then(|games| {
            games.into_iter()
                .max_by_key(|g| (g.verified as u8, g.name.len() as i32 * -1))
        }))
    }
    
    /// Get the SteamGridDB ID for a game by Steam app ID
    pub async fn get_game_by_steam_id(&self, steam_app_id: u32) -> Result<Option<SteamGridDBGame>> {
        let url = format!("{}/games/steam/{}", STEAMGRIDDB_API_BASE, steam_app_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .context("Failed to send Steam ID lookup request")?;
        
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        
        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            anyhow::bail!("SteamGridDB rate limit exceeded");
        }
        
        let data: SteamGridDBResponse<SteamGridDBGame> = response
            .json()
            .await
            .context("Failed to parse game response")?;
        
        Ok(data.data)
    }
    
    /// Fetch hero images for a game
    pub async fn get_heroes(&self, game_id: u64) -> Result<Vec<SteamGridDBImage>> {
        self.get_images("heroes", game_id).await
    }
    
    /// Fetch grid images for a game
    pub async fn get_grids(&self, game_id: u64) -> Result<Vec<SteamGridDBImage>> {
        self.get_images("grids", game_id).await
    }
    
    /// Fetch logo images for a game
    pub async fn get_logos(&self, game_id: u64) -> Result<Vec<SteamGridDBImage>> {
        self.get_images("logos", game_id).await
    }
    
    /// Fetch icon images for a game
    pub async fn get_icons(&self, game_id: u64) -> Result<Vec<SteamGridDBImage>> {
        self.get_images("icons", game_id).await
    }
    
    /// Generic image fetcher
    async fn get_images(&self, asset_type: &str, game_id: u64) -> Result<Vec<SteamGridDBImage>> {
        let url = format!("{}/{}/game/{}", STEAMGRIDDB_API_BASE, asset_type, game_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", self.auth_header())
            .query(&[("nsfw", "false"), ("humor", "false")])
            .send()
            .await
            .context(format!("Failed to fetch {} for game {}", asset_type, game_id))?;
        
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(vec![]);
        }
        
        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            anyhow::bail!("SteamGridDB rate limit exceeded");
        }
        
        let data: SteamGridDBResponse<Vec<SteamGridDBImage>> = response
            .json()
            .await
            .context(format!("Failed to parse {} response", asset_type))?;
        
        Ok(data.data.unwrap_or_default())
    }
    
    /// Get the best hero image for a game
    pub async fn get_best_hero(&self, game_id: u64) -> Result<Option<SteamGridDBImage>> {
        let heroes = self.get_heroes(game_id).await?;
        Ok(Self::select_best_image(heroes))
    }
    
    /// Get the best grid image for a game
    pub async fn get_best_grid(&self, game_id: u64) -> Result<Option<SteamGridDBImage>> {
        let grids = self.get_grids(game_id).await?;
        Ok(Self::select_best_image(grids))
    }
    
    /// Get the best logo image for a game
    pub async fn get_best_logo(&self, game_id: u64) -> Result<Option<SteamGridDBImage>> {
        let logos = self.get_logos(game_id).await?;
        Ok(Self::select_best_image(logos))
    }
    
    /// Get the best icon image for a game
    pub async fn get_best_icon(&self, game_id: u64) -> Result<Option<SteamGridDBImage>> {
        let icons = self.get_icons(game_id).await?;
        Ok(Self::select_best_image(icons))
    }
    
    /// Select the best image from a list (highest score, not NSFW/humor)
    fn select_best_image(images: Vec<SteamGridDBImage>) -> Option<SteamGridDBImage> {
        images.into_iter()
            .filter(|img| !img.nsfw && !img.humor)
            .max_by_key(|img| img.score)
    }
    
    /// Download an image from URL
    pub async fn download_image(&self, url: &str) -> Result<(Vec<u8>, String)> {
        let response = self.client
            .get(url)
            .send()
            .await
            .context("Failed to download image")?;
        
        if !response.status().is_success() {
            anyhow::bail!("Image download failed with status: {}", response.status());
        }
        
        // Get content type to determine extension
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("image/jpeg")
            .to_string();
        
        let extension = match content_type.as_str() {
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            _ => "jpg",
        };
        
        let bytes = response
            .bytes()
            .await
            .context("Failed to read image bytes")?
            .to_vec();
        
        Ok((bytes, extension.to_string()))
    }
    
    /// Search and fetch all assets for a game
    pub async fn fetch_all_assets(&self, game_name: &str) -> Result<GameAssets> {
        // Search for the game
        let game = self.search_game(game_name).await?
            .ok_or_else(|| anyhow::anyhow!("Game not found on SteamGridDB: {}", game_name))?;
        
        log::debug!("Found game on SteamGridDB: {} (id: {})", game.name, game.id);
        
        // Fetch all assets in parallel
        let (hero, grid, logo, icon) = tokio::join!(
            self.get_best_hero(game.id),
            self.get_best_grid(game.id),
            self.get_best_logo(game.id),
            self.get_best_icon(game.id)
        );
        
        Ok(GameAssets {
            game_id: game.id,
            game_name: game.name,
            hero: hero.ok().flatten(),
            grid: grid.ok().flatten(),
            logo: logo.ok().flatten(),
            icon: icon.ok().flatten(),
        })
    }
}

/// Collection of game assets
#[derive(Debug, Clone)]
pub struct GameAssets {
    pub game_id: u64,
    pub game_name: String,
    pub hero: Option<SteamGridDBImage>,
    pub grid: Option<SteamGridDBImage>,
    pub logo: Option<SteamGridDBImage>,
    pub icon: Option<SteamGridDBImage>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn mock_service() -> SteamGridDBService {
        SteamGridDBService::new("test_api_key".to_string())
    }
    
    #[test]
    fn test_auth_header() {
        let service = mock_service();
        assert_eq!(service.auth_header(), "Bearer test_api_key");
    }
    
    #[test]
    fn test_select_best_image() {
        let images = vec![
            SteamGridDBImage {
                id: 1,
                score: 5,
                style: "alternate".to_string(),
                url: "url1".to_string(),
                thumb: "thumb1".to_string(),
                width: 600,
                height: 900,
                mime: "image/png".to_string(),
                nsfw: false,
                humor: false,
            },
            SteamGridDBImage {
                id: 2,
                score: 10,
                style: "alternate".to_string(),
                url: "url2".to_string(),
                thumb: "thumb2".to_string(),
                width: 600,
                height: 900,
                mime: "image/png".to_string(),
                nsfw: false,
                humor: false,
            },
            SteamGridDBImage {
                id: 3,
                score: 15,
                style: "alternate".to_string(),
                url: "url3".to_string(),
                thumb: "thumb3".to_string(),
                width: 600,
                height: 900,
                mime: "image/png".to_string(),
                nsfw: true, // NSFW should be filtered
                humor: false,
            },
        ];
        
        let best = SteamGridDBService::select_best_image(images);
        assert!(best.is_some());
        assert_eq!(best.unwrap().id, 2); // ID 2 has highest score among non-NSFW
    }
    
    #[test]
    fn test_select_best_image_empty() {
        let images: Vec<SteamGridDBImage> = vec![];
        let best = SteamGridDBService::select_best_image(images);
        assert!(best.is_none());
    }
    
    #[test]
    fn test_grid_style() {
        assert_eq!(GridStyle::Alternate.as_str(), "alternate");
        assert_eq!(GridStyle::Material.as_str(), "material");
    }
}

// ===================== INTEGRATION TESTS (require API key) =====================
// These tests are ignored by default and can be run with:
// STEAMGRIDDB_API_KEY=your_key cargo test steamgriddb -- --ignored

#[cfg(test)]
mod integration_tests {
    use super::*;
    
    fn get_service() -> Option<SteamGridDBService> {
        SteamGridDBService::from_env().ok()
    }
    
    #[tokio::test]
    #[ignore = "Requires STEAMGRIDDB_API_KEY"]
    async fn test_search_game_success() {
        let service = get_service().expect("API key required");
        
        let result = service.search_game("Hollow Knight").await;
        assert!(result.is_ok());
        
        let game = result.unwrap();
        assert!(game.is_some());
        
        let game = game.unwrap();
        assert!(game.name.to_lowercase().contains("hollow knight"));
        println!("Found: {} (ID: {})", game.name, game.id);
    }
    
    #[tokio::test]
    #[ignore = "Requires STEAMGRIDDB_API_KEY"]
    async fn test_search_game_not_found() {
        let service = get_service().expect("API key required");
        
        let result = service.search_game("ThisGameDefinitelyDoesNotExist12345").await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
    
    #[tokio::test]
    #[ignore = "Requires STEAMGRIDDB_API_KEY"]
    async fn test_fetch_heroes() {
        let service = get_service().expect("API key required");
        
        // First search for a game
        let game = service.search_game("Hollow Knight").await
            .expect("Search failed")
            .expect("Game not found");
        
        let heroes = service.get_heroes(game.id).await;
        assert!(heroes.is_ok());
        
        let heroes = heroes.unwrap();
        println!("Found {} hero images for {}", heroes.len(), game.name);
        
        if !heroes.is_empty() {
            let best = &heroes[0];
            println!("Best hero: {} (score: {})", best.url, best.score);
        }
    }
    
    #[tokio::test]
    #[ignore = "Requires STEAMGRIDDB_API_KEY"]
    async fn test_fetch_all_assets() {
        let service = get_service().expect("API key required");
        
        let assets = service.fetch_all_assets("Hollow Knight").await;
        assert!(assets.is_ok());
        
        let assets = assets.unwrap();
        println!("Assets for {}", assets.game_name);
        println!("  Hero: {:?}", assets.hero.as_ref().map(|h| &h.url));
        println!("  Grid: {:?}", assets.grid.as_ref().map(|g| &g.url));
        println!("  Logo: {:?}", assets.logo.as_ref().map(|l| &l.url));
        println!("  Icon: {:?}", assets.icon.as_ref().map(|i| &i.url));
    }
    
    #[tokio::test]
    #[ignore = "Requires STEAMGRIDDB_API_KEY"]
    async fn test_download_image() {
        let service = get_service().expect("API key required");
        
        // Get a hero image
        let game = service.search_game("Hollow Knight").await
            .expect("Search failed")
            .expect("Game not found");
        
        let hero = service.get_best_hero(game.id).await
            .expect("Failed to get heroes")
            .expect("No heroes found");
        
        // Download it
        let (bytes, ext) = service.download_image(&hero.url).await
            .expect("Failed to download");
        
        assert!(!bytes.is_empty());
        println!("Downloaded {} bytes, extension: {}", bytes.len(), ext);
    }
}
