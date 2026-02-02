/**
 * SteamService - Steam store (reads local Steam library)
 * Note: Steam doesn't have a CLI like legendary/gogdl, so we read local files
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";

export class SteamService extends GameStoreService {
  get storeName(): Game["store"] {
    return "steam";
  }

  async listGames(): Promise<Game[]> {
    // Steam uses local file parsing, not a sidecar
    // We'll use a Tauri command for this since it requires filesystem access
    // For now, return empty array - will be implemented when we have the Rust helper

    // TODO: Implement Steam library reading
    // This would involve:
    // 1. Finding Steam installation path (~/.steam/steam on Linux)
    // 2. Reading steamapps/libraryfolders.vdf for library paths
    // 3. Reading appmanifest_*.acf files for installed games

    console.log("⚠️ Steam service: not yet implemented (requires filesystem access)");
    return [];
  }

  /**
   * Check if Steam is installed
   */
  async isInstalled(): Promise<boolean> {
    // This would check for Steam installation
    // For now, assume it might be installed
    return true;
  }

  /**
   * Steam authentication is handled by Steam client itself
   * We don't manage auth for Steam
   */
  async isAuthenticated(): Promise<boolean> {
    // Steam is authenticated if it's running and user is logged in
    // We can't really check this without Steam running
    return true;
  }

  /**
   * Get Steam app ID for a game title (for ProtonDB lookup)
   */
  async getSteamAppId(_gameTitle: string): Promise<number | null> {
    // This would query Steam API or local cache
    // For now, return null
    return null;
  }
}
