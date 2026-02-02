/**
 * @deprecated This file is kept for backward compatibility.
 * Import from '@/services/api' instead which now uses modular structure.
 *
 * All API functions have been moved to:
 * - api/core.ts - Tauri invoke wrapper
 * - api/mock.ts - Mock data utilities
 * - api/games.ts - Game CRUD operations
 * - api/store.ts - Store status and auth
 * - api/system.ts - System info and settings
 * - api/apiKeys.ts - API keys management
 * - api/updates.ts - System updates
 */

export * from "./api/index";
