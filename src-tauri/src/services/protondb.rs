//! ProtonDB Service for fetching Linux compatibility ratings
//!
//! API Documentation: https://www.protondb.com/
//!
//! Provides:
//! - Compatibility tier (platinum, gold, silver, bronze, borked)
//! - Confidence level
//! - Trending tier

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const PROTONDB_API_BASE: &str = "https://www.protondb.com/api/v1/reports/summaries";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

/// ProtonDB compatibility tier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProtonTier {
    Platinum,
    Gold,
    Silver,
    Bronze,
    Borked,
    Pending,
    Native,
}

impl ProtonTier {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "platinum" => Some(Self::Platinum),
            "gold" => Some(Self::Gold),
            "silver" => Some(Self::Silver),
            "bronze" => Some(Self::Bronze),
            "borked" => Some(Self::Borked),
            "pending" => Some(Self::Pending),
            "native" => Some(Self::Native),
            _ => None,
        }
    }

    // TODO: as_str() removed - use tier string directly

    /// Get a numeric score for sorting (higher is better)
    pub fn score(&self) -> u8 {
        match self {
            Self::Native => 100,
            Self::Platinum => 90,
            Self::Gold => 75,
            Self::Silver => 50,
            Self::Bronze => 25,
            Self::Borked => 0,
            Self::Pending => 10,
        }
    }

    /// Check if the tier is playable
    pub fn is_playable(&self) -> bool {
        match self {
            Self::Native | Self::Platinum | Self::Gold | Self::Silver => true,
            Self::Bronze | Self::Borked | Self::Pending => false,
        }
    }
}

/// ProtonDB summary response
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ProtonDBSummary {
    pub tier: String,
    pub total: u32,
    pub score: Option<f64>,
    pub confidence: Option<String>,
    pub trending_tier: Option<String>,
    pub best_reported_tier: Option<String>,
    pub provisional: Option<bool>,
}

/// Simplified ProtonDB compatibility info for caching
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProtonDBCompatibility {
    pub steam_app_id: Option<u32>,
    pub tier: Option<String>,
    pub tier_score: Option<u8>,
    pub confidence: Option<String>,
    pub trending_tier: Option<String>,
    pub best_reported_tier: Option<String>,
    pub total_reports: Option<u32>,
    pub is_playable: bool,
}

/// ProtonDB service
#[derive(Clone)]
pub struct ProtonDBService {
    client: Client,
}

impl ProtonDBService {
    /// Create a new ProtonDB service
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    /// Get compatibility summary for a Steam app ID
    pub async fn get_summary(&self, steam_app_id: u32) -> Result<Option<ProtonDBSummary>> {
        let url = format!("{}/{}.json", PROTONDB_API_BASE, steam_app_id);

        let response = self
            .client
            .get(&url)
            .header("User-Agent", "Pixxiden/1.0")
            .send()
            .await
            .context("Failed to fetch ProtonDB summary")?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            log::debug!("ProtonDB: No reports found for app {}", steam_app_id);
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            log::warn!(
                "ProtonDB request failed for app {}: {}",
                steam_app_id,
                status
            );
            anyhow::bail!("ProtonDB request failed with status: {}", status);
        }

        let summary: ProtonDBSummary = response
            .json()
            .await
            .context("Failed to parse ProtonDB response")?;

        Ok(Some(summary))
    }

    /// Get compatibility info parsed into our format
    pub async fn get_compatibility(
        &self,
        steam_app_id: u32,
    ) -> Result<Option<ProtonDBCompatibility>> {
        let summary = self.get_summary(steam_app_id).await?;

        Ok(summary.map(|s| {
            let tier = ProtonTier::from_str(&s.tier);

            ProtonDBCompatibility {
                steam_app_id: Some(steam_app_id),
                tier: Some(s.tier.clone()),
                tier_score: tier.map(|t| t.score()),
                confidence: s.confidence,
                trending_tier: s.trending_tier,
                best_reported_tier: s.best_reported_tier,
                total_reports: Some(s.total),
                is_playable: tier.map(|t| t.is_playable()).unwrap_or(false),
            }
        }))
    }

    // TODO: is_compatible() and get_batch_compatibility() removed
    // Use get_compatibility() and check is_playable field instead
}

impl Default for ProtonDBService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proton_tier_from_str() {
        assert_eq!(ProtonTier::from_str("platinum"), Some(ProtonTier::Platinum));
        assert_eq!(ProtonTier::from_str("GOLD"), Some(ProtonTier::Gold));
        assert_eq!(ProtonTier::from_str("Silver"), Some(ProtonTier::Silver));
        assert_eq!(ProtonTier::from_str("bronze"), Some(ProtonTier::Bronze));
        assert_eq!(ProtonTier::from_str("borked"), Some(ProtonTier::Borked));
        assert_eq!(ProtonTier::from_str("native"), Some(ProtonTier::Native));
        assert_eq!(ProtonTier::from_str("unknown"), None);
    }

    #[test]
    fn test_proton_tier_score() {
        assert_eq!(ProtonTier::Native.score(), 100);
        assert_eq!(ProtonTier::Platinum.score(), 90);
        assert_eq!(ProtonTier::Gold.score(), 75);
        assert_eq!(ProtonTier::Silver.score(), 50);
        assert_eq!(ProtonTier::Bronze.score(), 25);
        assert_eq!(ProtonTier::Borked.score(), 0);
    }

    #[test]
    fn test_proton_tier_is_playable() {
        assert!(ProtonTier::Native.is_playable());
        assert!(ProtonTier::Platinum.is_playable());
        assert!(ProtonTier::Gold.is_playable());
        assert!(ProtonTier::Silver.is_playable());
        assert!(!ProtonTier::Bronze.is_playable());
        assert!(!ProtonTier::Borked.is_playable());
    }

    #[test]
    fn test_compatibility_default() {
        let compat = ProtonDBCompatibility::default();
        assert!(compat.steam_app_id.is_none());
        assert!(!compat.is_playable);
    }
}

// ===================== INTEGRATION TESTS =====================

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    #[ignore = "Requires network access"]
    async fn test_get_summary_success() {
        let service = ProtonDBService::new();

        // Hollow Knight (known platinum)
        let result = service.get_summary(367520).await;
        assert!(result.is_ok(), "Request failed: {:?}", result.err());

        let summary = result.unwrap();
        assert!(summary.is_some(), "No summary found for Hollow Knight");

        let summary = summary.unwrap();
        println!("Hollow Knight ProtonDB:");
        println!("  Tier: {}", summary.tier);
        println!("  Total reports: {}", summary.total);
        println!("  Confidence: {:?}", summary.confidence);
        println!("  Trending: {:?}", summary.trending_tier);

        // Hollow Knight should be platinum or gold
        let tier = ProtonTier::from_str(&summary.tier);
        assert!(tier.is_some());
        assert!(tier.unwrap().is_playable());
    }

    #[tokio::test]
    #[ignore = "Requires network access"]
    async fn test_get_summary_not_found() {
        let service = ProtonDBService::new();

        // Non-existent app ID
        let result = service.get_summary(999999999).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    #[ignore = "Requires network access"]
    async fn test_get_compatibility() {
        let service = ProtonDBService::new();

        // Hollow Knight
        let result = service.get_compatibility(367520).await;
        assert!(result.is_ok(), "Request failed: {:?}", result.err());

        let compat = result.unwrap();
        assert!(compat.is_some(), "No compatibility found");

        let compat = compat.unwrap();
        println!("Hollow Knight compatibility:");
        println!("  Tier: {:?}", compat.tier);
        println!("  Score: {:?}", compat.tier_score);
        println!("  Playable: {}", compat.is_playable);

        assert!(compat.is_playable);
    }

    // Note: Tests for is_compatible and get_batch_compatibility removed
    // These methods were migrated to TypeScript services
}
