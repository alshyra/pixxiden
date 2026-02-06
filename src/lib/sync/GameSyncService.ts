/**
 * GameSyncService - Main game synchronization orchestrator
 *
 * This is the heart of the JS-first sync architecture.
 *
 * Responsibilities:
 * - Detects available/authenticated stores
 * - Fetches game libraries from each store via CLI sidecars
 * - Enriches games with metadata (IGDB, SteamGridDB, HLTB, ProtonDB)
 * - Persists everything to SQLite (pure TypeScript via plugin-sql)
 * - Reports progress via Tauri events for the splash screen
 *
 * Flow:
 *   Store CLIs → StoreGame[] → SQLite (base data) → EnrichmentService → SQLite (enriched data)
 *   ↳ emit('splash-progress') at each step
 */

import { emit } from "@tauri-apps/api/event";
import { debug, info, warn } from "@tauri-apps/plugin-log";
import type { Game, StoreType } from "@/types";
import { GameRepository } from "../database";
import { DatabaseService, SidecarService } from "@/services/base";
import { LegendaryService, GogdlService, NileService, SteamService } from "@/services/stores";
import { EnrichmentService } from "@/services/enrichment";
import { getApiKeys, getIGDBAccessToken } from "@/services/api/apiKeys";

// ===== Types =====

export interface SyncOptions {
  /** Which stores to sync (default: all) */
  stores?: StoreType[];
  /** Force re-enrichment even if already enriched */
  forceEnrich?: boolean;
  /** Skip enrichment entirely (faster sync) */
  skipEnrichment?: boolean;
}

export interface SyncResult {
  total: number;
  added: number;
  updated: number;
  enriched: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  store?: StoreType;
  gameTitle?: string;
  phase: "fetch" | "enrich" | "persist";
  message: string;
}

export interface SyncProgressEvent {
  store: string;
  gameTitle: string;
  current: number;
  total: number;
  phase: "fetching" | "enriching" | "complete";
  message: string;
}

// ===== Service =====

export class GameSyncService {
  private static instance: GameSyncService | null = null;

  private gameRepo: GameRepository;
  private enrichment: EnrichmentService;
  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;
  private steam: SteamService;

  private constructor() {
    const db = DatabaseService.getInstance();
    const sidecar = SidecarService.getInstance();

    this.gameRepo = GameRepository.getInstance();
    this.enrichment = new EnrichmentService(db);
    this.legendary = new LegendaryService(sidecar, db);
    this.gogdl = new GogdlService(sidecar, db);
    this.nile = new NileService(sidecar, db);
    this.steam = new SteamService(sidecar, db);
  }

  static getInstance(): GameSyncService {
    if (!GameSyncService.instance) {
      GameSyncService.instance = new GameSyncService();
    }
    return GameSyncService.instance;
  }

  /**
   * Main sync entry point
   * Fetches games from stores, enriches, and persists to SQLite
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const storesToSync = options.stores ?? ["epic", "gog", "amazon", "steam"];

    const result: SyncResult = {
      total: 0,
      added: 0,
      updated: 0,
      enriched: 0,
      errors: [],
      duration: 0,
    };

    await info(`Starting sync for stores: ${storesToSync.join(", ")}`);

    // Get existing game IDs to track new vs updated
    const existingIds = new Set((await this.gameRepo.getAllGames()).map((g) => g.id));

    // ===== Phase 1: Fetch games from each store =====
    const allFetchedGames: Game[] = [];

    for (const store of storesToSync) {
      try {
        await this.emitProgress({
          store,
          gameTitle: "",
          current: 0,
          total: 0,
          phase: "fetching",
          message: `Détection des jeux ${this.getStoreName(store)}...`,
        });

        const games = await this.fetchStoreGames(store);

        if (games.length > 0) {
          // Persist base game data to SQLite
          await this.gameRepo.upsertGames(games);

          for (const game of games) {
            if (existingIds.has(game.id)) {
              result.updated++;
            } else {
              result.added++;
            }
          }

          allFetchedGames.push(...games);
          await info(`${this.getStoreName(store)}: ${games.length} games`);
        }

        await this.emitProgress({
          store,
          gameTitle: "",
          current: games.length,
          total: games.length,
          phase: "fetching",
          message: `${this.getStoreName(store)}: ${games.length} jeux trouvés`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`Failed to sync ${store}: ${msg}`);
        result.errors.push({ store, phase: "fetch", message: msg });
      }
    }

    result.total = allFetchedGames.length;

    // ===== Phase 2: Enrich games with metadata =====
    if (!options.skipEnrichment && allFetchedGames.length > 0) {
      result.enriched = await this.enrichGames(
        allFetchedGames,
        options.forceEnrich ?? false,
        result.errors,
      );
    }

    result.duration = Date.now() - startTime;

    await this.emitProgress({
      store: "",
      gameTitle: "",
      current: result.total,
      total: result.total,
      phase: "complete",
      message: `Synchronisation terminée (${result.total} jeux)`,
    });

    await info(
      `Sync complete: ${result.total} total, ${result.added} added, ` +
        `${result.updated} updated, ${result.enriched} enriched ` +
        `(${result.duration}ms, ${result.errors.length} errors)`,
    );

    return result;
  }

  // ===== Store Fetching =====

  /**
   * Fetch games from a specific store
   * Checks authentication before attempting to fetch
   */
  private async fetchStoreGames(store: StoreType): Promise<Game[]> {
    switch (store) {
      case "epic": {
        const isAuth = await this.legendary.isAuthenticated();
        if (!isAuth) {
          await debug("Epic Games: not authenticated, skipping");
          return [];
        }
        return await this.legendary.listGames();
      }
      case "gog": {
        const isAuth = await this.gogdl.isAuthenticated();
        if (!isAuth) {
          await debug("GOG: not authenticated, skipping");
          return [];
        }
        return await this.gogdl.listGames();
      }
      case "amazon": {
        const isAuth = await this.nile.isAuthenticated();
        if (!isAuth) {
          await debug("Amazon: not authenticated, skipping");
          return [];
        }
        return await this.nile.listGames();
      }
      case "steam": {
        return await this.steam.listGames();
      }
      default:
        return [];
    }
  }

  // ===== Enrichment =====

  /**
   * Enrich games with metadata from external APIs
   * Configures API keys, filters unenriched games, and persists results
   */
  private async enrichGames(
    games: Game[],
    forceEnrich: boolean,
    errors: SyncError[],
  ): Promise<number> {
    // Configure enrichment with API keys from config file
    await this.configureEnrichment();

    // Filter to only games that need enrichment (unless forced)
    const gamesToEnrich = forceEnrich ? games : games.filter((g) => !g.enrichedAt);

    if (gamesToEnrich.length === 0) {
      await debug("All games already enriched, skipping");
      return 0;
    }

    await info(`Enriching ${gamesToEnrich.length} games...`);
    let enrichedCount = 0;

    for (let i = 0; i < gamesToEnrich.length; i++) {
      const game = gamesToEnrich[i];

      try {
        await this.emitProgress({
          store: game.store,
          gameTitle: game.title,
          current: i + 1,
          total: gamesToEnrich.length,
          phase: "enriching",
          message: `Enrichissement: ${game.title}`,
        });

        // EnrichmentService handles caching internally (enrichment_cache table)
        const enriched = await this.enrichment.enrichGame(game);

        // Persist enrichment data to the games table
        await this.gameRepo.updateEnrichment(game.id, {
          description: enriched.description,
          summary: enriched.summary,
          metacriticScore: enriched.metacriticScore,
          igdbRating: enriched.igdbRating,
          developer: enriched.developer,
          publisher: enriched.publisher,
          genres: enriched.genres,
          releaseDate: enriched.releaseDate,
          hltbMain: enriched.hltbMain,
          hltbMainExtra: enriched.hltbMainExtra,
          hltbComplete: enriched.hltbComplete,
          protonTier: enriched.protonTier,
          protonConfidence: enriched.protonConfidence,
          protonTrendingTier: enriched.protonTrendingTier,
          steamAppId: enriched.steamAppId,
          heroPath: enriched.heroPath,
          coverPath: enriched.coverPath,
          gridPath: enriched.gridPath,
          logoPath: enriched.logoPath,
          iconPath: enriched.iconPath,
          screenshotPaths: enriched.screenshotPaths,
          coverUrl: enriched.coverUrl,
          enrichedAt: enriched.enrichedAt,
        });

        enrichedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`Failed to enrich "${game.title}": ${msg}`);
        errors.push({ gameTitle: game.title, phase: "enrich", message: msg });
        // Continue with next game — don't stop on enrichment failure
      }
    }

    return enrichedCount;
  }

  /**
   * Configure enrichment service with API keys from config file
   * Uses getIGDBAccessToken() which handles OAuth token refresh
   */
  private async configureEnrichment(): Promise<void> {
    try {
      const apiKeys = await getApiKeys();
      const igdbToken = await getIGDBAccessToken();

      this.enrichment.configureApis({
        igdb:
          apiKeys.igdbClientId && igdbToken
            ? { clientId: apiKeys.igdbClientId, accessToken: igdbToken }
            : undefined,
        steamGridDb: apiKeys.steamgriddbApiKey ? { apiKey: apiKeys.steamgriddbApiKey } : undefined,
      });

      await debug(
        `Enrichment configured: ` +
          `IGDB=${apiKeys.hasIgdb ? "✅" : "❌"} ` +
          `SteamGridDB=${apiKeys.hasSteamgriddb ? "✅" : "❌"}`,
      );
    } catch (error) {
      await warn(`Failed to configure enrichment APIs: ${error}`);
    }
  }

  // ===== Progress Events =====

  /**
   * Emit a progress event for the splash screen
   * Uses Tauri event system — received by listen('splash-progress')
   */
  private async emitProgress(event: SyncProgressEvent): Promise<void> {
    try {
      await emit("splash-progress", event);
    } catch {
      // Don't fail sync if event emission fails
    }
  }

  // ===== Helpers =====

  /**
   * Get human-readable store name
   */
  private getStoreName(store: StoreType | string): string {
    const names: Record<string, string> = {
      epic: "Epic Games",
      gog: "GOG",
      amazon: "Amazon Games",
      steam: "Steam",
    };
    return names[store] || store;
  }
}
