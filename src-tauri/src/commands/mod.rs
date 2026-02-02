// Commands module - Re-exports all command modules
//
// Structure:
// - game.rs - Game queries
// - installation.rs - Install/uninstall operations  
// - launch.rs - Game launching
// - store.rs - Store status and auth
// - cache.rs - Cache management
// - api_keys.rs - API keys management
// - system.rs - System info and settings
// - updates.rs - System updates

mod api_keys;
mod cache;
mod game;
mod installation;
mod launch;
mod store;
mod system;
mod updates;

// Re-export all commands
pub use api_keys::*;
pub use cache::*;
pub use game::*;
pub use installation::*;
pub use launch::*;
pub use store::*;
pub use system::*;
pub use updates::*;

// Re-export AppState from game module
pub use game::AppState;
