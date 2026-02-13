/**
 * AmazonSyncStrategy - Sync logic for Amazon Games (via nile CLI)
 */

import type { Game, StoreType } from "@/types";
import { NileService } from "@/services/stores";
import { debug } from "@tauri-apps/plugin-log";
import type { SyncStrategy } from "./SyncStrategy";

export class AmazonSyncStrategy implements SyncStrategy {
  readonly storeName: StoreType = "amazon";
  readonly displayName = "Amazon Games";

  private nile: NileService;

  constructor() {
    this.nile = NileService.getInstance();
  }

  async isAuthenticated(): Promise<boolean> {
    const isAuth = await this.nile.isAuthenticated();
    if (!isAuth) {
      await debug("Amazon: not authenticated, skipping");
    }
    return isAuth;
  }

  async fetchGames(): Promise<Game[]> {
    return this.nile.listGames();
  }
}
