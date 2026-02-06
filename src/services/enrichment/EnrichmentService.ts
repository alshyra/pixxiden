/**
 * EnrichmentService - Enriches games with metadata from external APIs
 * Uses caching to avoid redundant API calls
 * Downloads images locally via ImageCacheService to avoid CDN rate limits
 */

import type { Game } from "@/types";
import { DatabaseService } from "../base/DatabaseService";
import { IgdbEnricher } from "./IgdbEnricher";
import { HltbEnricher } from "./HltbEnricher";
import { ProtonDbEnricher } from "./ProtonDbEnricher";
import { SteamGridDbEnricher } from "./SteamGridDbEnricher";
import { ImageCacheService } from "./ImageCacheService";
import { info, warn } from "@tauri-apps/plugin-log";

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
  private igdb: IgdbEnricher;
  private hltb: HltbEnricher;
  private protonDb: ProtonDbEnricher;
  private steamGridDb: SteamGridDbEnricher;
  private imageCache: ImageCacheService;

  constructor(private db: DatabaseService) {
    this.igdb = new IgdbEnricher();
    this.hltb = new HltbEnricher();
    this.protonDb = new ProtonDbEnricher();
    this.steamGridDb = new SteamGridDbEnricher();
    this.imageCache = ImageCacheService.getInstance();
  }

  /**
   * Configure API credentials
   */
  configureApis(config: {
    igdb?: { clientId: string; accessToken: string };
    steamGridDb?: { apiKey: string };
  }): void {
    if (config.igdb) {
      this.igdb.configure(config.igdb);
    }
    if (config.steamGridDb) {
      this.steamGridDb.configure(config.steamGridDb);
    }
  }

  /**
   * Enrich a list of games with metadata
   */
  async enrichGames(games: Game[]): Promise<Game[]> {
    const enriched: Game[] = [];

    for (const game of games) {
      try {
        enriched.push(await this.enrichGame(game));
      } catch (error) {
        await warn(`Failed to enrich ${game.title}: ${error}`);
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

    await info(`Enriching: ${game.title}`);

    // Fetch from APIs
    const enrichment: EnrichmentData = {
      igdb: await this.fetchIgdb(game.title).catch(() => null),
      hltb: await this.fetchHltb(game.title).catch(() => null),
      protonDb: game.steamAppId
        ? await this.fetchProtonDb(game.steamAppId).catch(() => null)
        : null,
      steamGridDb: await this.fetchSteamGridDb(game.title).catch(() => null),
    };

    // Save raw API data to cache
    await this.saveToCache(game.id, enrichment);

    // Apply enrichment (including image downloads)
    return this.applyEnrichment(game, enrichment);
  }

  /**
   * Apply enrichment data to a game
   * Downloads images locally and stores local paths
   */
  private async applyEnrichment(game: Game, data: EnrichmentData): Promise<Game> {
    const enriched = { ...game };

    // ===== IGDB Data =====
    if (data.igdb) {
      enriched.description = data.igdb.summary;
      enriched.summary = data.igdb.summary;
      enriched.igdbRating = data.igdb.rating ? Math.round(data.igdb.rating) : undefined;
      enriched.metacriticScore = data.igdb.aggregated_rating
        ? Math.round(data.igdb.aggregated_rating)
        : undefined;

      // Genres
      if (data.igdb.genres && data.igdb.genres.length > 0) {
        enriched.genres = data.igdb.genres.map((g) => g.name);
      }

      // Companies (developer & publisher)
      if (data.igdb.involved_companies) {
        const developer = data.igdb.involved_companies.find((c) => c.developer);
        const publisher = data.igdb.involved_companies.find((c) => c.publisher);
        if (developer) enriched.developer = developer.company.name;
        if (publisher) enriched.publisher = publisher.company.name;
      }

      // Release date
      if (data.igdb.first_release_date) {
        enriched.releaseDate = new Date(data.igdb.first_release_date * 1000).toISOString();
      }
    }

    // ===== HLTB Data =====
    if (data.hltb) {
      enriched.hltbMain = data.hltb.gameplayMain;
      enriched.hltbMainExtra = data.hltb.gameplayMainExtra;
      enriched.hltbComplete = data.hltb.gameplayCompletionist;
    }

    // ===== ProtonDB Data =====
    if (data.protonDb) {
      enriched.protonTier = data.protonDb.tier as Game["protonTier"];
      enriched.protonConfidence = data.protonDb.confidence;
      enriched.protonTrendingTier = data.protonDb.trendingTier;
    }

    // ===== Download & cache images locally =====
    try {
      // Collect all image URLs to download
      const imageUrls: {
        hero?: string;
        cover?: string;
        grid?: string;
        logo?: string;
        icon?: string;
        screenshots?: string[];
      } = {};

      // SteamGridDB images
      if (data.steamGridDb) {
        imageUrls.hero = data.steamGridDb.hero;
        imageUrls.grid = data.steamGridDb.grid;
        imageUrls.logo = data.steamGridDb.logo;
        imageUrls.icon = data.steamGridDb.icon;
      }

      // IGDB cover (use as cover if SteamGridDB grid not available)
      if (data.igdb?.cover?.url) {
        const coverUrl = data.igdb.cover.url.replace("t_thumb", "t_cover_big");
        if (!imageUrls.grid) {
          // Use IGDB cover as grid (box art) fallback
          imageUrls.cover = coverUrl;
        } else {
          imageUrls.cover = coverUrl;
        }
      }

      // IGDB screenshots (convert to full resolution)
      if (data.igdb?.screenshots && data.igdb.screenshots.length > 0) {
        imageUrls.screenshots = data.igdb.screenshots.map((s) =>
          s.url
            .replace("t_thumb", "t_screenshot_big")
            .replace("t_cover_big", "t_screenshot_big")
            .replace(/^\/\//, "https://"),
        );
      }

      // Download all images to local filesystem
      const hasAnyUrl = Object.values(imageUrls).some(
        (v) => v !== undefined && (typeof v === "string" || (Array.isArray(v) && v.length > 0)),
      );

      if (hasAnyUrl) {
        const cached = await this.imageCache.cacheGameImages(game.id, imageUrls);

        if (cached.heroPath) enriched.heroPath = cached.heroPath;
        if (cached.coverPath) enriched.coverPath = cached.coverPath;
        if (cached.gridPath) enriched.gridPath = cached.gridPath;
        if (cached.logoPath) enriched.logoPath = cached.logoPath;
        if (cached.iconPath) enriched.iconPath = cached.iconPath;
        if (cached.screenshotPaths && cached.screenshotPaths.length > 0) {
          enriched.screenshotPaths = cached.screenshotPaths;
        }
      }
    } catch (err) {
      await warn(`Image caching failed for ${game.title}: ${err}`);
      // Fallback: store URLs directly (legacy behavior)
      if (data.steamGridDb) {
        enriched.heroPath = data.steamGridDb.hero;
        enriched.gridPath = data.steamGridDb.grid;
        enriched.logoPath = data.steamGridDb.logo;
        enriched.iconPath = data.steamGridDb.icon;
      }
      if (data.igdb?.cover?.url) {
        enriched.coverUrl = data.igdb.cover.url.replace("t_thumb", "t_cover_big");
      }
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
    await this.imageCache.clearGameCache(gameId);
  }

  /**
   * Clear all enrichment cache
   */
  async clearAllCache(): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache");
    await this.imageCache.clearAllCache();
  }

  // ===== API Fetchers =====

  private async fetchIgdb(title: string): Promise<IgdbData | null> {
    try {
      return await this.igdb.search(title);
    } catch (error) {
      await warn(`IGDB fetch failed for "${title}": ${error}`);
      return null;
    }
  }

  private async fetchHltb(title: string): Promise<HltbData | null> {
    try {
      return await this.hltb.search(title);
    } catch (error) {
      await warn(`HLTB fetch failed for "${title}": ${error}`);
      return null;
    }
  }

  private async fetchProtonDb(steamAppId: number): Promise<ProtonDbData | null> {
    try {
      return await this.protonDb.searchByAppId(steamAppId);
    } catch (error) {
      await warn(`ProtonDB fetch failed for appId ${steamAppId}: ${error}`);
      return null;
    }
  }

  private async fetchSteamGridDb(title: string): Promise<SteamGridDbData | null> {
    try {
      return await this.steamGridDb.search(title);
    } catch (error) {
      await warn(`SteamGridDB fetch failed for "${title}": ${error}`);
      return null;
    }
  }
}
