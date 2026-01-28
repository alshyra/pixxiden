pub mod achievements;
pub mod api_keys;
pub mod auth;
pub mod cache_manager;
pub mod game_enricher;
pub mod howlongtobeat;
pub mod igdb;
pub mod protondb;
pub mod steamgriddb;

// Re-export main orchestrator for easy access
pub use api_keys::{ApiKeysConfig, ApiKeysManager};
pub use game_enricher::GameEnricher;
