pub mod achievements;
pub mod cache_manager;
pub mod game_enricher;
pub mod howlongtobeat;
pub mod igdb;
pub mod protondb;
pub mod steamgriddb;

// Re-export main orchestrator for easy access
pub use game_enricher::GameEnricher;
