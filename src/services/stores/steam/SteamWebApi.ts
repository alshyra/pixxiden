/**
 * Steam Web API Client
 * Fetches games from public Steam profiles
 */

import { fetch } from "@tauri-apps/plugin-http";
import { warn, info } from "@tauri-apps/plugin-log";
import type { Game } from "@/types";
import { createGame } from "@/types";

interface SteamWebApiGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
}

interface SteamGamesResponse {
  response: {
    game_count: number;
    games: SteamWebApiGame[];
  };
}

export class SteamWebApi {
  private static readonly API_BASE = "https://api.steampowered.com";
  private static readonly PROFILE_BASE = "https://steamcommunity.com";

  /**
   * Get owned games from a Steam profile (requires public profile)
   * Uses the official Steam Web API endpoint
   */
  static async getOwnedGames(steamId: string, apiKey?: string): Promise<Game[]> {
    try {
      await info(`Fetching owned games for Steam ID: ${steamId}`);

      // If we have an API key, use the official API (more reliable)
      if (apiKey) {
        return await this.getOwnedGamesViaApi(steamId, apiKey);
      }

      // Otherwise, try to scrape the public profile (less reliable)
      return await this.getOwnedGamesViaProfile(steamId);
    } catch (error) {
      await warn(`Failed to fetch Steam owned games: ${error}`);
      throw error;
    }
  }

  /**
   * Use Steam Web API (requires API key)
   */
  private static async getOwnedGamesViaApi(steamId: string, apiKey: string): Promise<Game[]> {
    const url = `${this.API_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Steam API request failed: ${response.status}`);
    }

    const data: SteamGamesResponse = await response.json();

    if (!data || !data.response || !data.response.games) {
      throw new Error("Invalid response from Steam API");
    }

    const games = data.response.games.map((game: SteamWebApiGame) =>
      this.convertWebApiGameToGame(game),
    );

    await info(`Fetched ${games.length} owned games from Steam Web API`);
    return games;
  }

  /**
   * Scrape public profile (fallback method, less reliable)
   * Format: https://steamcommunity.com/profiles/[steamid]/games/?tab=all&xml=1
   */
  private static async getOwnedGamesViaProfile(steamId: string): Promise<Game[]> {
    const url = `${this.PROFILE_BASE}/profiles/${steamId}/games/?tab=all&xml=1`;

    await info(`Fetching games from public profile: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "Steam profile is private. Please make your game library public in Steam settings.",
        );
      }
      throw new Error(`Failed to fetch Steam profile: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse XML response
    const games = this.parseGamesXml(xmlText);

    await info(`Fetched ${games.length} owned games from Steam profile`);
    return games;
  }

  /**
   * Parse Steam profile games XML
   */
  private static parseGamesXml(xml: string): Game[] {
    const games: Game[] = [];

    // Simple XML parsing (could use a proper XML parser library if needed)
    const gameMatches = xml.matchAll(
      /<game>.*?<appID>(\d+)<\/appID>.*?<name><!\[CDATA\[(.*?)\]\]><\/name>.*?<hoursOnRecord>([\d.]*)<\/hoursOnRecord>.*?<\/game>/gs,
    );

    for (const match of gameMatches) {
      const [, appId, name, hoursPlayed] = match;

      if (appId && name) {
        const playtime = hoursPlayed ? Math.round(parseFloat(hoursPlayed) * 60) : 0; // Convert hours to minutes

        games.push(
          createGame({
            id: `steam_${appId}`,
            store: "steam",
            storeId: appId,
            title: name,
            installed: false, // Not installed locally
            playTimeMinutes: playtime > 0 ? playtime : 0,
          }),
        );
      }
    }

    return games;
  }

  /**
   * Convert Steam Web API game to Game object
   */
  private static convertWebApiGameToGame(apiGame: SteamWebApiGame): Game {
    const playtime = apiGame.playtime_forever > 0 ? apiGame.playtime_forever : 0;

    const game = createGame({
      id: `steam_${apiGame.appid}`,
      store: "steam",
      storeId: apiGame.appid.toString(),
      title: apiGame.name,
      installed: false, // Not installed locally (this is from web API)
      playTimeMinutes: playtime,
    });

    // Add icon if available
    if (apiGame.img_icon_url) {
      game.assets.iconPath = `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${apiGame.appid}/${apiGame.img_icon_url}.jpg`;
    }

    return game;
  }
}
