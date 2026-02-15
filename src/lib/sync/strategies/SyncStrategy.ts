/**
 * SyncStrategy - Interface for store-specific game sync logic
 *
 * Each store (Epic, GOG, Amazon, Steam) has its own strategy for:
 * - Checking authentication status
 * - Fetching the game library from the store's CLI/API
 *
 * Strategies are stateless wrappers around the existing store services.
 */

import type { Game, StoreType } from "@/types";

/**
 * Strategy interface — one implementation per store.
 */
export interface SyncStrategy {
  /** Store identifier */
  readonly storeName: StoreType;

  /** Human-readable store display name */
  readonly displayName: string;

  /** Check if the user is authenticated with this store */
  isAuthenticated(): Promise<boolean>;

  /** Fetch all games from this store's library */
  fetchGames(): Promise<Game[]>;
}
