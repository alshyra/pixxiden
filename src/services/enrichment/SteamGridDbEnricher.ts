/**
 * SteamGridDbEnricher - Fetches game artwork from SteamGridDB
 * Requires API key from https://www.steamgriddb.com/profile/preferences/api
 */

import { fetch } from "@tauri-apps/plugin-http";
import { debug, error as logError } from "@tauri-apps/plugin-log";
import type { SteamGridDbData } from "./EnrichmentService";

interface SteamGridDbConfig {
  apiKey: string;
}

export interface SteamGridDbSearchResult {
  id: number;
  name: string;
  types: string[];
  verified: boolean;
}

export interface SteamGridDbImage {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  author: {
    name: string;
  };
  score?: number;
  style?: string;
  nsfw?: boolean;
}

export class SteamGridDbEnricher {
  private static readonly API_URL = "https://www.steamgriddb.com/api/v2";
  private config: SteamGridDbConfig | null = null;

  /**
   * Configure SteamGridDB API key
   */
  configure(config: SteamGridDbConfig): void {
    this.config = config;
  }

  /**
   * Search for game artwork by title
   */
  async search(title: string): Promise<SteamGridDbData | null> {
    if (!this.config) {
      throw new Error("SteamGridDB not configured. Call configure() first.");
    }

    try {
      await debug(`SteamGridDB: Searching for "${title}"`);

      // First, search for the game to get its ID
      const gameId = await this.searchGameId(title);

      if (!gameId) {
        await debug(`SteamGridDB: No results for "${title}"`);
        return null;
      }

      await debug(`SteamGridDB: Found game ID ${gameId}`);

      // Fetch all artwork types for this game
      const [hero, grid, horizontalGrid, logo, icon] = await Promise.all([
        this.getHeroImage(gameId),
        this.getGridImage(gameId),
        this.getHorizontalGridImage(gameId),
        this.getLogoImage(gameId),
        this.getIconImage(gameId),
      ]);

      return {
        hero,
        grid,
        horizontalGrid,
        logo,
        icon,
      };
    } catch (error) {
      await logError(`SteamGridDB error for "${title}": ${error}`);
      throw error;
    }
  }

  /**
   * Search for game ID by title.
   * Public so the image override modal can resolve a game ID before browsing.
   */
  async searchGameId(title: string): Promise<number | null> {
    if (!this.config) throw new Error("SteamGridDB not configured");

    const response = await fetch(
      `${SteamGridDbEnricher.API_URL}/search/autocomplete/${encodeURIComponent(title)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`SteamGridDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      return null;
    }

    const results: SteamGridDbSearchResult[] = data.data;
    return this.pickBestMatch(results, title);
  }

  /**
   * Pick the best match from autocomplete results.
   *
   * Priority:
   * 1. Exact match (case-insensitive) + verified
   * 2. Exact match (case-insensitive)
   * 3. Verified result (first)
   * 4. First result (fallback)
   */
  private pickBestMatch(results: SteamGridDbSearchResult[], title: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[\u2018\u2019\u2032\u00B4]/g, "'")
        .replace(/[\u201C\u201D]/g, '"');

    const normalizedTitle = normalize(title);

    // 1. Exact match + verified
    const exactVerified = results.find((r) => normalize(r.name) === normalizedTitle && r.verified);
    if (exactVerified) return exactVerified.id;

    // 2. Exact match (any)
    const exactMatch = results.find((r) => normalize(r.name) === normalizedTitle);
    if (exactMatch) return exactMatch.id;

    // 3. First verified result
    const verified = results.find((r) => r.verified);
    if (verified) return verified.id;

    // 4. Fallback to first result
    return results[0].id;
  }

  /**
   * Get hero image (wide banner)
   */
  private async getHeroImage(gameId: number): Promise<string | undefined> {
    const images = await this.fetchImages(gameId, "heroes");
    return images.length > 0 ? images[0].url : undefined;
  }

  /**
   * Get grid image (vertical box art, 2:3 ratio — e.g. 600x900)
   */
  private async getGridImage(gameId: number): Promise<string | undefined> {
    const images = await this.fetchImages(gameId, "grids", "600x900");
    return images.length > 0 ? images[0].url : undefined;
  }

  /**
   * Get horizontal grid image (landscape, 92:43 ratio — e.g. 920x430, 460x215)
   */
  private async getHorizontalGridImage(gameId: number): Promise<string | undefined> {
    const images = await this.fetchImages(gameId, "grids", "920x430,460x215");
    return images.length > 0 ? images[0].url : undefined;
  }

  /**
   * Get logo image (transparent logo)
   */
  private async getLogoImage(gameId: number): Promise<string | undefined> {
    const images = await this.fetchImages(gameId, "logos");
    return images.length > 0 ? images[0].url : undefined;
  }

  /**
   * Get icon image (small square icon)
   */
  private async getIconImage(gameId: number): Promise<string | undefined> {
    const images = await this.fetchImages(gameId, "icons");
    return images.length > 0 ? images[0].url : undefined;
  }

  /**
   * Fetch images of a specific type for a game.
   * Public so the image override modal can display a gallery.
   * @param dimensions Optional SteamGridDB dimensions filter (e.g. "600x900" or "920x430,460x215")
   */
  async fetchImages(
    gameId: number,
    type: "heroes" | "grids" | "logos" | "icons",
    dimensions?: string,
  ): Promise<SteamGridDbImage[]> {
    if (!this.config) throw new Error("SteamGridDB not configured");

    let url = `${SteamGridDbEnricher.API_URL}/${type}/game/${gameId}`;
    if (dimensions) {
      url += `?dimensions=${dimensions}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`SteamGridDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return [];
    }

    // Trust API's default ordering (factors in views + community score)
    const images: SteamGridDbImage[] = data.data;
    return images.filter((img) => !img.nsfw); // Filter out NSFW images
  }

  /**
   * Search by Steam App ID (more reliable than title search)
   */
  async searchBySteamId(steamAppId: number): Promise<SteamGridDbData | null> {
    if (!this.config) {
      throw new Error("SteamGridDB not configured. Call configure() first.");
    }

    try {
      await debug(`SteamGridDB: Searching for Steam ID ${steamAppId}`);

      const response = await fetch(`${SteamGridDbEnricher.API_URL}/games/steam/${steamAppId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          await debug(`SteamGridDB: No results for Steam ID ${steamAppId}`);
          return null;
        }
        throw new Error(`SteamGridDB API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        return null;
      }

      const gameId = data.data.id;
      await debug(`SteamGridDB: Found game ID ${gameId} for Steam ID ${steamAppId}`);

      // Fetch all artwork types
      const [hero, grid, horizontalGrid, logo, icon] = await Promise.all([
        this.getHeroImage(gameId),
        this.getGridImage(gameId),
        this.getHorizontalGridImage(gameId),
        this.getLogoImage(gameId),
        this.getIconImage(gameId),
      ]);

      return {
        hero,
        grid,
        horizontalGrid,
        logo,
        icon,
      };
    } catch (error) {
      await logError(`SteamGridDB error for Steam ID ${steamAppId}: ${error}`);
      throw error;
    }
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(`${SteamGridDbEnricher.API_URL}/games/steam/1`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get download URL for an image (with optional dimensions)
   */
  getImageUrl(imageUrl: string, options?: { width?: number; height?: number }): string {
    if (!options) return imageUrl;

    // SteamGridDB supports resizing via URL parameters
    const url = new URL(imageUrl);

    if (options.width) {
      url.searchParams.set("w", options.width.toString());
    }

    if (options.height) {
      url.searchParams.set("h", options.height.toString());
    }

    return url.toString();
  }
}
