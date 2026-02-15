/**
 * EpicSyncStrategy - Sync logic for Epic Games (via legendary CLI)
 */

import type { Game, StoreType } from "@/types";
import { LegendaryService } from "@/services/stores";
import { debug } from "@tauri-apps/plugin-log";
import type { SyncStrategy } from "./SyncStrategy";

export class EpicSyncStrategy implements SyncStrategy {
  readonly storeName: StoreType = "epic";
  readonly displayName = "Epic Games";

  private legendary: LegendaryService;

  constructor() {
    this.legendary = LegendaryService.getInstance();
  }

  async isAuthenticated(): Promise<boolean> {
    const isAuth = await this.legendary.isAuthenticated();
    if (!isAuth) {
      await debug("Epic Games: not authenticated, skipping");
    }
    return isAuth;
  }

  async fetchGames(): Promise<Game[]> {
    return this.legendary.listGames();
  }
}
