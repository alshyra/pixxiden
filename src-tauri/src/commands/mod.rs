// Commands module - Re-exports all command modules
//
// Structure:
// - game.rs - Game queries
// - cache.rs - Cache management
// - system.rs - System info and settings
// - updates.rs - System updates

mod cache;
mod game;
mod system;
mod updates;

// Re-export all commands
pub use cache::*;
pub use game::*;
pub use system::*;
pub use updates::*;

// Re-export AppState from game module
pub use game::AppState;
