/**
 * GogSyncStrategy - Sync logic for GOG games (via gogdl CLI)
 */

import type { Game, StoreType } from "@/types";
import { GogdlService } from "@/services/stores";
import { info, warn } from "@tauri-apps/plugin-log";
import type { SyncStrategy } from "./SyncStrategy";

export class GogSyncStrategy implements SyncStrategy {
  readonly storeName: StoreType = "gog";
  readonly displayName = "GOG";

  private gogdl: GogdlService;

  constructor() {
    this.gogdl = GogdlService.getInstance();
  }

  async isAuthenticated(): Promise<boolean> {
    const isAuth = await this.gogdl.isAuthenticated();
    await info(`GOG: isAuthenticated=${isAuth}`);
    if (!isAuth) {
      await warn("GOG: not authenticated, skipping");
    }
    return isAuth;
  }

  async fetchGames(): Promise<Game[]> {
    const games = await this.gogdl.listGames();
    await info(`GOG: listGames returned ${games.length} games`);
    return games;
  }
}
