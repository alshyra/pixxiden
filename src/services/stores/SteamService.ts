/**
 * SteamService - Steam store (reads local Steam library + public profile)
 */

import type { Game } from "@/types";
import { GameStoreService, type StoreCapabilities } from "./GameStoreService";
import { warn, info } from "@tauri-apps/plugin-log";
import { DatabaseService } from "../base/DatabaseService";
import { SidecarService } from "../base/SidecarService";
import { SteamLocalLibrary, SteamWebApi } from "./steam";
import { loadConfig } from "../api/apiKeys/ConfigManager";

export class SteamService extends GameStoreService {
  private static instance: SteamService | null = null;

  private constructor() {
    super(SidecarService.getInstance(), DatabaseService.getInstance());
  }

  static getInstance(): SteamService {
    if (!SteamService.instance) {
      SteamService.instance = new SteamService();
    }
    return SteamService.instance;
  }

  get storeName(): Game["storeData"]["store"] {
    return "steam";
  }

  getCapabilities(): StoreCapabilities {
    return {
      canListGames: true, // Now implemented!
      canInstall: true, // Via steam:// protocol
      canLaunch: true, // Via steam -applaunch
      canGetInfo: false,
      canSyncSaves: false, // Steam handles this natively
    };
  }

  /**
   * List all Steam games (installed + owned)
   * Combines local filesystem inspection with public profile API
   */
  async listGames(): Promise<Game[]> {
    try {
      await info("SteamService: Fetching Steam games...");

      // Get installed games from local filesystem
      const installedGames = await SteamLocalLibrary.getInstalledGames();
      await info(`SteamService: Found ${installedGames.length} installed games`);

      // Get owned games from public profile (if configured)
      let ownedGames: Game[] = [];
      try {
        const config = await loadConfig();

        if (config.steamId) {
          await info(`SteamService: Fetching owned games for Steam ID: ${config.steamId}`);
          ownedGames = await SteamWebApi.getOwnedGames(
            config.steamId,
            config.steamApiKey || undefined,
          );
          await info(`SteamService: Found ${ownedGames.length} owned games`);
        } else {
          await warn(
            "SteamService: Steam ID not configured, skipping public profile fetch. Configure it in settings.",
          );
        }
      } catch (error) {
        await warn(`SteamService: Failed to fetch owned games: ${error}`);
        // Continue with just installed games
      }

      // Merge installed + owned games (prioritize installed for duplicates)
      const gamesMap = new Map<string, Game>();

      // Add owned games first
      for (const game of ownedGames) {
        gamesMap.set(game.id, game);
      }

      // Overlay installed games (they have more accurate data)
      for (const game of installedGames) {
        const existing = gamesMap.get(game.id);
        if (existing) {
          // Merge: keep web data but override with local install info
          gamesMap.set(game.id, {
            ...existing,
            installation: {
              ...existing.installation,
              installed: true,
              installPath: game.installation.installPath,
              installSize: game.installation.installSize,
            },
            // Keep playtime from web if local doesn't have it
            gameCompletion: {
              ...existing.gameCompletion,
              playTimeMinutes:
                game.gameCompletion.playTimeMinutes || existing.gameCompletion.playTimeMinutes,
            },
            // Merge assets
            assets: {
              ...existing.assets,
              ...game.assets,
            },
          });
        } else {
          gamesMap.set(game.id, game);
        }
      }

      const allGames = Array.from(gamesMap.values());
      await info(`SteamService: Returning ${allGames.length} total games`);

      return allGames;
    } catch (error) {
      await warn(`SteamService: Failed to list games: ${error}`);
      throw error;
    }
  }

  /**
   * Check if Steam is installed
   */
  async isInstalled(): Promise<boolean> {
    // Check if we can find Steam installation
    try {
      const games = await SteamLocalLibrary.getInstalledGames();
      return games.length > 0;
    } catch {
      return false;
    }
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
  async getSteamAppId(gameTitle: string): Promise<number | null> {
    try {
      // Search in our cached games
      const games = await this.listGames();
      const game = games.find(
        (g) =>
          g.info.title.toLowerCase() === gameTitle.toLowerCase() ||
          g.info.title.includes(gameTitle),
      );

      if (game && game.storeData.storeId) {
        return parseInt(game.storeData.storeId, 10);
      }
    } catch (error) {
      await warn(`Failed to get Steam app ID for ${gameTitle}: ${error}`);
    }

    return null;
  }
}
