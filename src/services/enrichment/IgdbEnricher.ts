/**
 * IgdbEnricher - Fetches game metadata from IGDB API
 * Requires IGDB Client ID and Access Token from Twitch Developer Portal
 */

import { fetch } from "@tauri-apps/plugin-http";
import { debug, error as logError } from "@tauri-apps/plugin-log";
import type { IgdbData } from "./EnrichmentService";

interface IgdbConfig {
  clientId: string;
  accessToken: string;
}

interface IgdbGame {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  genres?: { id: number; name: string }[];
  involved_companies?: {
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
  }[];
  first_release_date?: number;
  cover?: { id: number; url: string };
  screenshots?: { id: number; url: string }[];
}

export class IgdbEnricher {
  private static readonly API_URL = "https://api.igdb.com/v4";
  private config: IgdbConfig | null = null;

  /**
   * Configure IGDB credentials
   */
  configure(config: IgdbConfig): void {
    this.config = config;
  }

  /**
   * Search for a game by title
   */
  async search(title: string): Promise<IgdbData | null> {
    if (!this.config) {
      throw new Error("IGDB not configured. Call configure() first.");
    }

    try {
      // Build query to search for game
      const query = `
        search "${title}";
        fields name, summary, rating, aggregated_rating, 
               genres.name, 
               involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
               first_release_date, 
               cover.url, 
               screenshots.url;
        limit 1;
      `;

      const response = await fetch(`${IgdbEnricher.API_URL}/games`, {
        method: "POST",
        headers: {
          "Client-ID": this.config.clientId,
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "text/plain",
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const games: IgdbGame[] = await response.json();

      if (games.length === 0) {
        await debug(`IGDB: No results for "${title}"`);
        return null;
      }

      const game = games[0];
      await debug(`IGDB: Found "${game.name}"`);

      return this.mapToIgdbData(game);
    } catch (error) {
      await logError(`IGDB error for "${title}": ${error}`);
      throw error;
    }
  }

  /**
   * Get game by IGDB ID
   */
  async getById(igdbId: number): Promise<IgdbData | null> {
    if (!this.config) {
      throw new Error("IGDB not configured. Call configure() first.");
    }

    try {
      const query = `
        fields name, summary, rating, aggregated_rating, 
               genres.name, 
               involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
               first_release_date, 
               cover.url, 
               screenshots.url;
        where id = ${igdbId};
      `;

      const response = await fetch(`${IgdbEnricher.API_URL}/games`, {
        method: "POST",
        headers: {
          "Client-ID": this.config.clientId,
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "text/plain",
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const games: IgdbGame[] = await response.json();

      if (games.length === 0) {
        return null;
      }

      return this.mapToIgdbData(games[0]);
    } catch (error) {
      await logError(`IGDB error for ID ${igdbId}: ${error}`);
      throw error;
    }
  }

  /**
   * Map IGDB response to our data structure
   */
  private mapToIgdbData(game: IgdbGame): IgdbData {
    return {
      id: game.id,
      name: game.name,
      summary: game.summary,
      rating: game.rating,
      aggregated_rating: game.aggregated_rating,
      genres: game.genres?.map((g) => ({ name: g.name })),
      involved_companies: game.involved_companies?.map((ic) => ({
        company: { name: ic.company.name },
        developer: ic.developer,
        publisher: ic.publisher,
      })),
      first_release_date: game.first_release_date,
      cover: game.cover ? { url: this.fixImageUrl(game.cover.url) } : undefined,
      screenshots: game.screenshots?.map((s) => ({ url: this.fixImageUrl(s.url) })),
    };
  }

  /**
   * Fix IGDB image URLs (convert to HTTPS and proper size)
   */
  private fixImageUrl(url: string): string {
    if (!url) return url;

    // IGDB returns URLs like "//images.igdb.com/igdb/image/upload/t_thumb/..."
    // We need to:
    // 1. Add https:
    // 2. Change thumbnail size to cover_big

    let fixed = url;

    if (fixed.startsWith("//")) {
      fixed = `https:${fixed}`;
    }

    // Replace thumb with cover_big for better quality
    fixed = fixed.replace("/t_thumb/", "/t_cover_big/");

    return fixed;
  }

  /**
   * Validate credentials by making a test request
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(`${IgdbEnricher.API_URL}/games`, {
        method: "POST",
        headers: {
          "Client-ID": this.config.clientId,
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "text/plain",
        },
        body: "fields id; limit 1;",
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
