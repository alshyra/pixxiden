/**
 * IgdbEnricher - Fetches game metadata from IGDB API
 *
 * Also fetches:
 * - game_time_to_beats (replaces HowLongToBeat — less external services = better UX)
 * - external_games (to extract Steam App ID for ProtonDB lookup)
 */

import { fetch } from "@tauri-apps/plugin-http";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";
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
  external_games?: { category: number; uid: string }[];
}

/** IGDB game_time_to_beats response */
interface IgdbTimeToBeat {
  id: number;
  game_id: number;
  hastily?: number; // seconds
  normally?: number; // seconds
  completely?: number; // seconds
}

export class IgdbEnricher {
  private static readonly API_URL = "https://api.igdb.com/v4";
  private config: IgdbConfig | null = null;

  configure(config: IgdbConfig): void {
    this.config = config;
  }

  /**
   * Search for a game by title — returns metadata + time_to_beat + Steam App ID
   */
  async search(title: string): Promise<IgdbData | null> {
    if (!this.config) {
      throw new Error("IGDB not configured. Call configure() first.");
    }

    try {
      // Search with external_games for Steam App ID extraction
      const query = `
        search "${title}";
        fields name, summary, rating, aggregated_rating,
               genres.name,
               involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
               first_release_date,
               cover.url,
               screenshots.url,
               external_games.category, external_games.uid;
        limit 1;
      `;

      const response = await this.igdbFetch("/games", query);
      const games: IgdbGame[] = await response.json();

      if (games.length === 0) {
        await debug(`IGDB: No results for "${title}"`);
        return null;
      }

      const game = games[0];
      await debug(`IGDB: Found "${game.name}" (id=${game.id})`);

      // Fetch time_to_beats for this game
      const timeToBeat = await this.fetchTimeToBeat(game.id);

      return this.mapToIgdbData(game, timeToBeat);
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
               screenshots.url,
               external_games.category, external_games.uid;
        where id = ${igdbId};
      `;

      const response = await this.igdbFetch("/games", query);
      const games: IgdbGame[] = await response.json();

      if (games.length === 0) return null;

      const timeToBeat = await this.fetchTimeToBeat(igdbId);
      return this.mapToIgdbData(games[0], timeToBeat);
    } catch (error) {
      await logError(`IGDB error for ID ${igdbId}: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch game_time_to_beats for a given IGDB game ID
   * Returns time in **hours** (API returns seconds)
   */
  private async fetchTimeToBeat(igdbGameId: number): Promise<IgdbTimeToBeat | null> {
    try {
      const query = `
        fields hastily, normally, completely;
        where game_id = ${igdbGameId};
        limit 1;
      `;

      const response = await this.igdbFetch("/game_time_to_beats", query);
      const results: IgdbTimeToBeat[] = await response.json();

      if (results.length === 0) {
        await debug(`IGDB: No time_to_beat data for game ${igdbGameId}`);
        return null;
      }

      return results[0];
    } catch (error) {
      await warn(`IGDB time_to_beat fetch failed for game ${igdbGameId}: ${error}`);
      return null;
    }
  }

  /**
   * Helper: POST to an IGDB endpoint
   */
  private async igdbFetch(endpoint: string, body: string): Promise<Response> {
    if (!this.config) throw new Error("IGDB not configured");

    const response = await fetch(`${IgdbEnricher.API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": this.config.clientId,
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    return response;
  }

  /**
   * Map IGDB response to our enrichment data structure
   * Extracts Steam App ID from external_games (category 1 = Steam)
   */
  private mapToIgdbData(game: IgdbGame, timeToBeat: IgdbTimeToBeat | null): IgdbData {
    // Extract Steam App ID from external_games (category 1 = Steam)
    let steamAppId: number | undefined;
    if (game.external_games) {
      const steamEntry = game.external_games.find((eg) => eg.category === 1);
      if (steamEntry?.uid) {
        steamAppId = parseInt(steamEntry.uid, 10);
        if (isNaN(steamAppId)) steamAppId = undefined;
      }
    }

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
      steamAppId,
      timeToBeat: timeToBeat
        ? {
            // Convert seconds → hours (rounded to 1 decimal)
            hastily: timeToBeat.hastily ? Math.round((timeToBeat.hastily / 3600) * 10) / 10 : 0,
            normally: timeToBeat.normally ? Math.round((timeToBeat.normally / 3600) * 10) / 10 : 0,
            completely: timeToBeat.completely
              ? Math.round((timeToBeat.completely / 3600) * 10) / 10
              : 0,
          }
        : undefined,
    };
  }

  /**
   * Fix IGDB image URLs (convert to HTTPS and proper size)
   */
  private fixImageUrl(url: string): string {
    if (!url) return url;
    let fixed = url;
    if (fixed.startsWith("//")) {
      fixed = `https:${fixed}`;
    }
    fixed = fixed.replace("/t_thumb/", "/t_cover_big/");
    return fixed;
  }

  /**
   * Validate credentials by making a test request
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.config) return false;
    try {
      const response = await this.igdbFetch("/games", "fields id; limit 1;");
      return response.ok;
    } catch {
      return false;
    }
  }
}
