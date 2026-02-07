// Commands module - Re-exports all command modules
//
// Structure:
// - game.rs - Game queries
// - system.rs - System info and settings
// - updates.rs - System updates

mod system;
mod updates;

// Re-export all commands
pub use system::*;
pub use updates::*;
