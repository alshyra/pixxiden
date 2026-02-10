/**
 * EnrichmentService - Enriches games with metadata from external APIs
 *
 * Sources:
 * - IGDB: metadata, scores, genres, companies, time_to_beat, Steam App ID
 * - SteamGridDB: hero/grid/logo/icon images
 * - ProtonDB: Linux compatibility ratings (uses Steam App ID from IGDB)
 *
 * HowLongToBeat has been replaced by IGDB's game_time_to_beats endpoint.
 */

import type { Game } from "@/types";
import { DatabaseService } from "../base/DatabaseService";
import { IgdbEnricher } from "./IgdbEnricher";
import { ProtonDbEnricher } from "./ProtonDbEnricher";
import { SteamGridDbEnricher } from "./SteamGridDbEnricher";
import { ImageCacheService } from "./ImageCacheService";
import { info, warn } from "@tauri-apps/plugin-log";

export interface EnrichmentData {
  igdb?: IgdbData | null;
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
  /** Steam App ID extracted from IGDB external_games (category=1) */
  steamAppId?: number;
  /** Time to beat data from IGDB game_time_to_beats (hours) */
  timeToBeat?: { hastily: number; normally: number; completely: number };
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
  horizontalGrid?: string;
  logo?: string;
  icon?: string;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cache version — increment when enrichment data shape changes.
 * Old cache entries with a different version are automatically invalidated.
 *
 * History:
 *  v1 — initial (manual IGDB, separate HLTB, no external_games)
 *  v2 — IGDB time_to_beats + external_games for Steam App ID (2025-06)
 *  v3 — SteamGridDB horizontal grid images (2026-02)
 */
const CACHE_VERSION = 3;

export class EnrichmentService {
  private igdb: IgdbEnricher;
  private protonDb: ProtonDbEnricher;
  private steamGridDb: SteamGridDbEnricher;
  private imageCache: ImageCacheService;

  constructor(private db: DatabaseService) {
    this.igdb = new IgdbEnricher();
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
        await warn(`Failed to enrich ${game.info.title}: ${error}`);
        enriched.push(game);
      }
    }

    return enriched;
  }

  /**
   * Enrich a single game with metadata from all sources
   *
   * Pipeline:
   * 1. Check cache
   * 2. Fetch IGDB (metadata + time_to_beat + Steam App ID)
   * 3. Use Steam App ID from IGDB to fetch ProtonDB
   * 4. Fetch SteamGridDB images
   * 5. Download & cache images locally
   */
  async enrichGame(game: Game): Promise<Game> {
    // Check cache first
    const cached = await this.getFromCache(game.id);
    if (cached && this.isCacheValid(cached.fetchedAt)) {
      return this.applyEnrichment(game, cached.data);
    }

    await info(`Enriching: ${game.info.title}`);

    // Step 1: Fetch IGDB — gives us metadata + time_to_beat + Steam App ID
    const igdb = await this.fetchIgdb(game.info.title).catch(() => null);

    // Step 2: Use Steam App ID from IGDB (or existing) for ProtonDB
    const steamAppId = igdb?.steamAppId || game.protonData.steamAppId || 0;
    const protonDb = steamAppId > 0 ? await this.fetchProtonDb(steamAppId).catch(() => null) : null;

    // Step 3: SteamGridDB images
    const steamGridDb = await this.fetchSteamGridDb(game.info.title).catch(() => null);

    const enrichment: EnrichmentData = { igdb, protonDb, steamGridDb };

    // Save raw API data to cache
    await this.saveToCache(game.id, enrichment);

    // Apply enrichment (including image downloads)
    return this.applyEnrichment(game, enrichment);
  }

  /**
   * Apply enrichment data to a game — returns a new Game with nested objects populated
   */
  private async applyEnrichment(game: Game, data: EnrichmentData): Promise<Game> {
    // Deep clone to avoid mutating the original
    const enriched: Game = structuredClone(game);

    // ===== IGDB Data =====
    if (data.igdb) {
      const igdb = data.igdb;
      enriched.info.description = igdb.summary || enriched.info.description;
      enriched.info.summary = igdb.summary || enriched.info.summary;
      enriched.info.igdbRating = igdb.rating ? Math.round(igdb.rating) : enriched.info.igdbRating;
      enriched.info.metacriticScore = igdb.aggregated_rating
        ? Math.round(igdb.aggregated_rating)
        : enriched.info.metacriticScore;

      if (igdb.genres?.length) {
        enriched.info.genres = igdb.genres.map((g) => g.name);
      }

      if (igdb.involved_companies) {
        const dev = igdb.involved_companies.find((c) => c.developer);
        const pub = igdb.involved_companies.find((c) => c.publisher);
        if (dev) enriched.info.developer = dev.company.name;
        if (pub) enriched.info.publisher = pub.company.name;
      }

      if (igdb.first_release_date) {
        enriched.info.releaseDate = new Date(igdb.first_release_date * 1000).toISOString();
      }

      // Time to beat from IGDB (replaces HLTB)
      if (igdb.timeToBeat) {
        enriched.gameCompletion.timeToBeatHastily = igdb.timeToBeat.hastily;
        enriched.gameCompletion.timeToBeatNormally = igdb.timeToBeat.normally;
        enriched.gameCompletion.timeToBeatCompletely = igdb.timeToBeat.completely;
      }

      // Steam App ID for ProtonDB
      if (igdb.steamAppId) {
        enriched.protonData.steamAppId = igdb.steamAppId;
      }
    }

    // ===== ProtonDB Data =====
    if (data.protonDb) {
      enriched.protonData.protonTier = data.protonDb.tier as Game["protonData"]["protonTier"];
      enriched.protonData.protonConfidence = data.protonDb.confidence;
      enriched.protonData.protonTrendingTier = data.protonDb.trendingTier || "";
    }

    // ===== Download & cache images locally =====
    try {
      const imageUrls: {
        hero?: string;
        cover?: string;
        grid?: string;
        horizontalGrid?: string;
        logo?: string;
        icon?: string;
        screenshots?: string[];
      } = {};

      // SteamGridDB images
      if (data.steamGridDb) {
        imageUrls.hero = data.steamGridDb.hero;
        imageUrls.grid = data.steamGridDb.grid;
        imageUrls.horizontalGrid = data.steamGridDb.horizontalGrid;
        imageUrls.logo = data.steamGridDb.logo;
        imageUrls.icon = data.steamGridDb.icon;
      }

      // IGDB screenshots
      if (data.igdb?.screenshots?.length) {
        imageUrls.screenshots = data.igdb.screenshots.map((s) =>
          s.url
            .replace("t_thumb", "t_screenshot_big")
            .replace("t_cover_big", "t_screenshot_big")
            .replace(/^\/\//, "https://"),
        );
      }

      const hasAnyUrl = Object.values(imageUrls).some(
        (v) => v !== undefined && (typeof v === "string" || (Array.isArray(v) && v.length > 0)),
      );

      if (hasAnyUrl) {
        const cached = await this.imageCache.cacheGameImages(game.id, imageUrls);
        if (cached.heroPath) enriched.assets.heroPath = cached.heroPath;
        if (cached.coverPath) enriched.assets.coverPath = cached.coverPath;
        if (cached.gridPath) enriched.assets.gridPath = cached.gridPath;
        if (cached.horizontalGridPath) enriched.assets.horizontalGridPath = cached.horizontalGridPath;
        if (cached.logoPath) enriched.assets.logoPath = cached.logoPath;
        if (cached.iconPath) enriched.assets.iconPath = cached.iconPath;
        if (cached.screenshotPaths?.length) {
          enriched.assets.screenshotPaths = cached.screenshotPaths;
        }
      }
    } catch (err) {
      await warn(`Image caching failed for ${game.info.title}: ${err}`);
      // Fallback: store URLs directly
      if (data.steamGridDb) {
        enriched.assets.heroPath = data.steamGridDb.hero || "";
        enriched.assets.gridPath = data.steamGridDb.grid || "";
        enriched.assets.horizontalGridPath = data.steamGridDb.horizontalGrid || "";
        enriched.assets.logoPath = data.steamGridDb.logo || "";
        enriched.assets.iconPath = data.steamGridDb.icon || "";
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
      const parsed = JSON.parse(row.data);
      // Invalidate cache if version doesn't match (schema changed)
      if (parsed._cacheVersion !== CACHE_VERSION) {
        await info(
          `Cache version mismatch for ${gameId} (v${parsed._cacheVersion ?? 1} → v${CACHE_VERSION}), re-enriching`,
        );
        return null;
      }
      return {
        data: parsed,
        fetchedAt: row.fetched_at,
      };
    } catch {
      return null;
    }
  }

  private async saveToCache(gameId: string, data: EnrichmentData): Promise<void> {
    const versioned = { ...data, _cacheVersion: CACHE_VERSION };
    await this.db.execute(
      `INSERT OR REPLACE INTO enrichment_cache (game_id, provider, data, fetched_at)
       VALUES (?, 'all', ?, CURRENT_TIMESTAMP)`,
      [gameId, JSON.stringify(versioned)],
    );
  }

  private isCacheValid(fetchedAt: string): boolean {
    const fetchedTime = new Date(fetchedAt).getTime();
    return Date.now() - fetchedTime < CACHE_TTL_MS;
  }

  /**
   * Invalidate outdated cache entries (wrong version) and reset enriched_at
   * for affected games so they get re-enriched on next sync.
   *
   * Called automatically at the start of enrichGames().
   * Returns the number of invalidated entries.
   */
  async invalidateOutdatedCache(): Promise<number> {
    // Find all cache entries without the current version
    const rows = await this.db.select<{ game_id: string; data: string }>(
      `SELECT game_id, data FROM enrichment_cache WHERE provider = 'all'`,
    );

    const outdatedIds: string[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.data);
        if (parsed._cacheVersion !== CACHE_VERSION) {
          outdatedIds.push(row.game_id);
        }
      } catch {
        outdatedIds.push(row.game_id);
      }
    }

    if (outdatedIds.length === 0) return 0;

    await info(
      `Invalidating ${outdatedIds.length} outdated cache entries (upgrading to v${CACHE_VERSION})`,
    );

    // Delete outdated cache entries
    const placeholders = outdatedIds.map(() => "?").join(",");
    await this.db.execute(
      `DELETE FROM enrichment_cache WHERE game_id IN (${placeholders}) AND provider = 'all'`,
      outdatedIds,
    );

    // Reset enriched_at for those games so GameSyncService re-enriches them
    await this.db.execute(
      `UPDATE games SET enriched_at = NULL WHERE id IN (${placeholders})`,
      outdatedIds,
    );

    return outdatedIds.length;
  }

  async clearCache(gameId: string): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache WHERE game_id = ?", [gameId]);
    await this.imageCache.clearGameCache(gameId);
  }

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
