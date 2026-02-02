/**
 * EnrichmentService - Enriches games with metadata from external APIs
 * Uses caching to avoid redundant API calls
 */

import type { Game } from "@/types";
import { DatabaseService } from "../base/DatabaseService";

export interface EnrichmentData {
  igdb?: IgdbData | null;
  hltb?: HltbData | null;
  protonDb?: ProtonDbData | null;
  steamGridDb?: SteamGridDbData | null;
}

export interface IgdbData {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  genres?: { name: string }[];
  involved_companies?: { company: { name: string }; developer?: boolean; publisher?: boolean }[];
  first_release_date?: number;
  cover?: { url: string };
  screenshots?: { url: string }[];
}

export interface HltbData {
  gameplayMain?: number;
  gameplayMainExtra?: number;
  gameplayCompletionist?: number;
  gameplayAllStyles?: number;
}

export interface ProtonDbData {
  tier: string;
  confidence: string;
  trendingTier?: string;
  score?: number;
}

export interface SteamGridDbData {
  hero?: string;
  grid?: string;
  logo?: string;
  icon?: string;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class EnrichmentService {
  constructor(private db: DatabaseService) {}

  /**
   * Enrich a list of games with metadata
   */
  async enrichGames(games: Game[]): Promise<Game[]> {
    const enriched: Game[] = [];

    for (const game of games) {
      try {
        enriched.push(await this.enrichGame(game));
      } catch (error) {
        console.warn(`⚠️ Failed to enrich ${game.title}:`, error);
        enriched.push(game);
      }
    }

    return enriched;
  }

  /**
   * Enrich a single game with metadata
   */
  async enrichGame(game: Game): Promise<Game> {
    // Check cache first
    const cached = await this.getFromCache(game.id);
    if (cached && this.isCacheValid(cached.fetchedAt)) {
      return this.applyEnrichment(game, cached.data);
    }

    console.log(`🔍 Enriching: ${game.title}`);

    // Fetch from APIs
    const enrichment: EnrichmentData = {
      igdb: await this.fetchIgdb(game.title).catch(() => null),
      hltb: await this.fetchHltb(game.title).catch(() => null),
      protonDb: game.steamAppId
        ? await this.fetchProtonDb(game.steamAppId).catch(() => null)
        : null,
      steamGridDb: await this.fetchSteamGridDb(game.title).catch(() => null),
    };

    // Save to cache
    await this.saveToCache(game.id, enrichment);

    return this.applyEnrichment(game, enrichment);
  }

  /**
   * Apply enrichment data to a game
   */
  private applyEnrichment(game: Game, data: EnrichmentData): Game {
    const enriched = { ...game };

    if (data.igdb) {
      enriched.description = data.igdb.summary;
      enriched.igdbRating = data.igdb.rating ? Math.round(data.igdb.rating) : undefined;
      enriched.metacriticScore = data.igdb.aggregated_rating
        ? Math.round(data.igdb.aggregated_rating)
        : undefined;

      if (data.igdb.genres) {
        enriched.genres = data.igdb.genres.map((g) => g.name);
      }

      if (data.igdb.involved_companies) {
        const developer = data.igdb.involved_companies.find((c) => c.developer);
        const publisher = data.igdb.involved_companies.find((c) => c.publisher);
        enriched.developer = developer?.company.name;
        enriched.publisher = publisher?.company.name;
      }

      if (data.igdb.first_release_date) {
        enriched.releaseDate = new Date(data.igdb.first_release_date * 1000).toISOString();
      }

      if (data.igdb.cover?.url) {
        enriched.coverUrl = data.igdb.cover.url.replace("t_thumb", "t_cover_big");
      }
    }

    if (data.hltb) {
      enriched.hltbMain = data.hltb.gameplayMain;
      enriched.hltbMainExtra = data.hltb.gameplayMainExtra;
      enriched.hltbComplete = data.hltb.gameplayCompletionist;
    }

    if (data.protonDb) {
      enriched.protonTier = data.protonDb.tier as Game["protonTier"];
      enriched.protonConfidence = data.protonDb.confidence;
      enriched.protonTrendingTier = data.protonDb.trendingTier;
    }

    if (data.steamGridDb) {
      enriched.heroPath = data.steamGridDb.hero;
      enriched.gridPath = data.steamGridDb.grid;
      enriched.logoPath = data.steamGridDb.logo;
      enriched.iconPath = data.steamGridDb.icon;
    }

    enriched.enrichedAt = new Date().toISOString();
    return enriched;
  }

  // ===== Cache Management =====

  private async getFromCache(
    gameId: string,
  ): Promise<{ data: EnrichmentData; fetchedAt: string } | null> {
    const row = await this.db.queryOne<{ data: string; fetched_at: string }>(
      `SELECT data, fetched_at FROM enrichment_cache 
       WHERE game_id = ? AND provider = 'all'`,
      [gameId],
    );

    if (!row) return null;

    try {
      return {
        data: JSON.parse(row.data),
        fetchedAt: row.fetched_at,
      };
    } catch {
      return null;
    }
  }

  private async saveToCache(gameId: string, data: EnrichmentData): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO enrichment_cache (game_id, provider, data, fetched_at)
       VALUES (?, 'all', ?, CURRENT_TIMESTAMP)`,
      [gameId, JSON.stringify(data)],
    );
  }

  private isCacheValid(fetchedAt: string): boolean {
    const fetchedTime = new Date(fetchedAt).getTime();
    return Date.now() - fetchedTime < CACHE_TTL_MS;
  }

  /**
   * Clear enrichment cache for a specific game
   */
  async clearCache(gameId: string): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache WHERE game_id = ?", [gameId]);
  }

  /**
   * Clear all enrichment cache
   */
  async clearAllCache(): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache");
  }

  // ===== API Fetchers (to be implemented) =====

  private async fetchIgdb(title: string): Promise<IgdbData | null> {
    // TODO: Implement IGDB API call
    // Requires IGDB client ID and access token
    console.log(`📡 IGDB: searching for "${title}" (not implemented)`);
    return null;
  }

  private async fetchHltb(title: string): Promise<HltbData | null> {
    // TODO: Implement HowLongToBeat scraping/API
    console.log(`📡 HLTB: searching for "${title}" (not implemented)`);
    return null;
  }

  private async fetchProtonDb(steamAppId: number): Promise<ProtonDbData | null> {
    // TODO: Implement ProtonDB API call
    console.log(`📡 ProtonDB: searching for appId ${steamAppId} (not implemented)`);
    return null;
  }

  private async fetchSteamGridDb(title: string): Promise<SteamGridDbData | null> {
    // TODO: Implement SteamGridDB API call
    console.log(`📡 SteamGridDB: searching for "${title}" (not implemented)`);
    return null;
  }
}
