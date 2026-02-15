/**
 * SteamSyncStrategy - Sync logic for Steam games (local filesystem + API)
 *
 * Steam is always "authenticated" since we read local files.
 */

import type { Game, StoreType } from "@/types";
import { SteamService } from "@/services/stores";
import type { SyncStrategy } from "./SyncStrategy";

export class SteamSyncStrategy implements SyncStrategy {
  readonly storeName: StoreType = "steam";
  readonly displayName = "Steam";

  private steam: SteamService;

  constructor() {
    this.steam = SteamService.getInstance();
  }

  async isAuthenticated(): Promise<boolean> {
    // Steam is always accessible (reads local files)
    return true;
  }

  async fetchGames(): Promise<Game[]> {
    return this.steam.listGames();
  }
}
