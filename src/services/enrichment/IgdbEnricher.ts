/**
 * IgdbEnricher - Fetches game metadata from IGDB API
 *
 * Uses the typed IgdbClient (backed by openapi-ts generated types).
 *
 * Also fetches:
 * - game_time_to_beats (replaces HowLongToBeat — less external services = better UX)
 * - external_games (to extract Steam App ID for ProtonDB lookup)
 */

import { debug, warn, error as logError } from "@tauri-apps/plugin-log";
import type { IgdbData } from "./EnrichmentService";
import {
  IgdbClient,
  EXTERNAL_GAME_STEAM,
  type IgdbClientConfig,
  type IgdbGameExpanded,
} from "@/services/igdb";
import type { GameTimeToBeat } from "@/services/igdb";

export class IgdbEnricher {
  private client = new IgdbClient();

  configure(config: IgdbClientConfig): void {
    this.client.configure(config);
  }

  /**
   * Search for a game by title — returns metadata + time_to_beat + Steam App ID
   */
  async search(title: string): Promise<IgdbData | null> {
    try {
      const games = await this.client.searchGames(title, 1);

      if (games.length === 0) {
        await debug(`IGDB: No results for "${title}"`);
        return null;
      }

      const game = games[0];
      await debug(`IGDB: Found "${game.name}" (id=${game.id})`);

      // Fetch time_to_beats for this game
      const timeToBeat = game.id ? await this.fetchTimeToBeat(game.id) : null;

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
    try {
      const game = await this.client.getGameById(igdbId);

      if (!game) return null;

      const timeToBeat = await this.fetchTimeToBeat(igdbId);
      return this.mapToIgdbData(game, timeToBeat);
    } catch (error) {
      await logError(`IGDB error for ID ${igdbId}: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch game_time_to_beats for a given IGDB game ID.
   * Uses the generated GameTimeToBeat type (values in seconds).
   */
  private async fetchTimeToBeat(igdbGameId: number): Promise<GameTimeToBeat | null> {
    try {
      const result = await this.client.getTimeToBeat(igdbGameId);

      if (!result) {
        await debug(`IGDB: No time_to_beat data for game ${igdbGameId}`);
        return null;
      }

      await debug(
        `IGDB: time_to_beat for game ${igdbGameId}: ` +
          `hastily=${result.hastily ?? "N/A"}s, ` +
          `normally=${result.normally ?? "N/A"}s, ` +
          `completely=${result.completely ?? "N/A"}s`,
      );

      return result;
    } catch (error) {
      await warn(`IGDB time_to_beat fetch failed for game ${igdbGameId}: ${error}`);
      return null;
    }
  }

  /**
   * Map IGDB expanded response to our enrichment data structure.
   * Extracts Steam App ID from external_games (category 1 = Steam).
   * Converts time_to_beat seconds → hours.
   */
  private mapToIgdbData(game: IgdbGameExpanded, timeToBeat: GameTimeToBeat | null): IgdbData {
    // Extract Steam App ID from external_games (category 1 = Steam)
    let steamAppId: number | undefined;
    if (game.external_games) {
      const steamEntry = game.external_games.find((eg) => eg.category === EXTERNAL_GAME_STEAM);
      if (steamEntry?.uid) {
        steamAppId = parseInt(steamEntry.uid, 10);
        if (isNaN(steamAppId)) steamAppId = undefined;
      }
    }

    return {
      id: game.id ?? 0,
      name: game.name ?? "",
      summary: game.summary,
      rating: game.rating,
      aggregated_rating: game.aggregated_rating,
      genres: game.genres?.map((g) => ({ name: g.name ?? "" })),
      involved_companies: game.involved_companies?.map((ic) => ({
        company: { name: ic.company?.name ?? "" },
        developer: ic.developer,
        publisher: ic.publisher,
      })),
      first_release_date: game.first_release_date,
      cover: game.cover?.url ? { url: this.fixImageUrl(game.cover.url) } : undefined,
      screenshots: game.screenshots?.map((s) => ({
        url: this.fixImageUrl(s.url ?? ""),
      })),
      steamAppId,
      timeToBeat: timeToBeat
        ? {
            // Convert seconds → hours (rounded to 1 decimal)
            hastily: timeToBeat.hastily ? Math.round((timeToBeat.hastily / 3600) * 10) / 10 : 0,
            normally: timeToBeat.normally
              ? Math.round((timeToBeat.normally / 3600) * 10) / 10
              : 0,
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
    return this.client.validateCredentials();
  }
}
