/**
 * IgdbClient - Low-level typed IGDB API client
 *
 * Uses Tauri's `@tauri-apps/plugin-http` fetch for HTTP requests
 * and types from the openapi-ts generated client (`./generated/types.gen`).
 *
 * IGDB API uses Apicalypse (text/plain POST body) for queries.
 * Field expansion (e.g., `genres.name`) returns objects instead of IDs,
 * so we define our own "expanded" response types below.
 */

import { fetch } from "@tauri-apps/plugin-http";
import { debug, warn } from "@tauri-apps/plugin-log";
import type {
  Cover,
  ExternalGame,
  ExternalGameCategoryEnums,
  GameTimeToBeat,
  Genre,
  Id,
  Screenshot,
} from "./generated";

// ===== Constants =====

const IGDB_BASE_URL = "https://api.igdb.com/v4";

/** Steam category in IGDB's ExternalGame model */
export const EXTERNAL_GAME_STEAM: ExternalGameCategoryEnums = 1;

// ===== Expanded Response Types =====
// When using Apicalypse field expansion, IGDB returns full objects
// instead of just IDs. These types reflect the expanded response shape.

/** Genre with name expanded (from `genres.name`) */
export type GenreExpanded = Pick<Genre, "id" | "name">;

/** Cover with url expanded (from `cover.url`) */
export type CoverExpanded = Pick<Cover, "id" | "url">;

/** Screenshot with url expanded (from `screenshots.url`) */
export type ScreenshotExpanded = Pick<Screenshot, "id" | "url">;

/** ExternalGame with category + uid expanded */
export type ExternalGameExpanded = Pick<ExternalGame, "id" | "category" | "uid">;

/** InvolvedCompany with company expanded (from `involved_companies.company.name`) */
export interface InvolvedCompanyExpanded {
  id?: Id;
  company?: { id?: Id; name?: string };
  developer?: boolean;
  publisher?: boolean;
}

/** Full IGDB game response with all fields expanded via Apicalypse */
export interface IgdbGameExpanded {
  id?: Id;
  name?: string;
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  first_release_date?: number;
  genres?: GenreExpanded[];
  involved_companies?: InvolvedCompanyExpanded[];
  cover?: CoverExpanded;
  screenshots?: ScreenshotExpanded[];
  external_games?: ExternalGameExpanded[];
}

// ===== Client Config =====

export interface IgdbClientConfig {
  clientId: string;
  accessToken: string;
}

// ===== Client =====

export class IgdbClient {
  private config: IgdbClientConfig | null = null;

  configure(config: IgdbClientConfig): void {
    this.config = config;
  }

  get isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Search games by title.
   * Returns expanded game objects with genres, companies, cover, screenshots, external_games.
   */
  async searchGames(title: string, limit = 1): Promise<IgdbGameExpanded[]> {
    const query = `
      search "${title}";
      fields name, summary, rating, aggregated_rating,
             genres.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             first_release_date,
             cover.url,
             screenshots.url,
             external_games.category, external_games.uid;
      limit ${limit};
    `;
    return this.post<IgdbGameExpanded[]>("/games", query);
  }

  /**
   * Get a game by IGDB ID.
   * Returns expanded game object.
   */
  async getGameById(igdbId: number): Promise<IgdbGameExpanded | null> {
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
    const results = await this.post<IgdbGameExpanded[]>("/games", query);
    return results[0] ?? null;
  }

  /**
   * Fetch time-to-beat data for a game.
   * Uses the generated `GameTimeToBeat` type directly (no expansion needed).
   */
  async getTimeToBeat(igdbGameId: number): Promise<GameTimeToBeat | null> {
    const query = `
      fields hastily, normally, completely;
      where game_id = ${igdbGameId};
      limit 1;
    `;
    const results = await this.post<GameTimeToBeat[]>("/game_time_to_beats", query);
    return results[0] ?? null;
  }

  /**
   * Validate credentials by making a test request
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.post("/games", "fields id; limit 1;");
      return true;
    } catch {
      return false;
    }
  }

  // ===== Internal =====

  /**
   * POST to an IGDB endpoint with an Apicalypse query body.
   * Handles auth headers and error logging.
   */
  private async post<T>(endpoint: string, body: string): Promise<T> {
    if (!this.config) {
      throw new Error("IgdbClient not configured. Call configure() first.");
    }

    const url = `${IGDB_BASE_URL}${endpoint}`;

    await debug(`IGDB POST ${endpoint}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Client-ID": this.config.clientId,
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      await warn(`IGDB ${endpoint} error ${response.status}: ${text}`);
      throw new Error(`IGDB API error: ${response.status} ${text}`);
    }

    return response.json() as Promise<T>;
  }
}
