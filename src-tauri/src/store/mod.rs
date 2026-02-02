pub mod gogdl;
pub mod legendary;
pub mod nile;
pub mod steam;

// TODO: trait StoreAdapter and all implementations removed
// Game detection and CLI execution migrated to TypeScript services:
// - LegendaryService.ts (Epic Games)
// - GogdlService.ts (GOG)
// - SteamService.ts (Steam)
// - NileService.ts (Amazon Games)
// Only binary/config detection remains in Rust adapters
