/**
 * GameSyncService - Game synchronization pipeline
 *
 * Pure pipeline service — no store-specific logic, no concrete service imports.
 * All dependencies are injected via interfaces:
 * - SyncStrategy[] for store fetch/auth
 * - EnrichmentPipeline for metadata enrichment
 * - HeroicMerger for Heroic launcher integration
 * - GameRepository for persistence
 *
 * Responsibilities:
 * - Runs the sync pipeline: fetch → persist → heroic merge → enrich
 * - Reports progress via Tauri events for the splash screen
 *
 * Flow:
 *   SyncStrategy.fetchGames() → SQLite (base data) → EnrichmentPipeline → SQLite (enriched data)
 *   ↳ emit('splash-progress') at each step
 */

import { emit } from "@tauri-apps/api/event";
import { debug, info, warn } from "@tauri-apps/plugin-log";
import type { Game, StoreType } from "@/types";
import { GameRepository } from "../database";
import type { SyncStrategy } from "./strategies/SyncStrategy";
import { EpicSyncStrategy } from "./strategies/EpicSyncStrategy";
import { GogSyncStrategy } from "./strategies/GogSyncStrategy";
import { AmazonSyncStrategy } from "./strategies/AmazonSyncStrategy";
import { SteamSyncStrategy } from "./strategies/SteamSyncStrategy";

// Concrete imports — used ONLY in getInstance() for default wiring.
// For testing, use createWithDeps() to inject mocks instead.
import { EnrichmentService } from "@/services/enrichment";
import { HeroicImportService } from "@/services/heroic";
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

// ===== Dependency Interfaces =====

/**
 * Interface for the enrichment pipeline.
 * Decouples GameSyncService from the concrete EnrichmentService.
 */
export interface EnrichmentPipeline {
  /** Configure API keys for enrichment providers */
  configureApis(config: {
    igdb?: { clientId: string; accessToken: string };
    steamGridDb?: { apiKey: string };
  }): void;
  /** Invalidate outdated cache entries, returns count of invalidated */
  invalidateOutdatedCache(): Promise<number>;
  /** Enrich a single game with metadata from external APIs */
  enrichGame(game: Game): Promise<Game>;
}

/**
 * Interface for external launcher merge (Heroic, Lutris, etc.).
 * External launchers install games independently — this interface
 * discovers those installations and updates Pixxiden's DB.
 */
export interface ExternalLauncherMerger {
  /** Human-readable name for progress display (e.g. "heroic", "lutris") */
  readonly name: string;
  /** Discover and merge installations into DB. Returns scan/merge counts. */
  mergeInstallations(): Promise<{ scanned: number; merged: number }>;
}

/**
 * Interface for API key resolution.
 * Decouples GameSyncService from the concrete apiKeys module.
 */
export interface ApiKeyProvider {
  getApiKeys(): Promise<{
    hasIgdb: boolean;
    igdbClientId: string | null;
    hasSteamgriddb: boolean;
    steamgriddbApiKey: string | null;
  }>;
  getIGDBAccessToken(): Promise<string | null>;
}

// ===== Service =====

export class GameSyncService {
  private static instance: GameSyncService | null = null;

  private gameRepo: GameRepository;
  private enrichment: EnrichmentPipeline;
  private externalMergers: ExternalLauncherMerger[];
  private apiKeyProvider: ApiKeyProvider;
  private strategies: Map<StoreType, SyncStrategy>;

  private constructor(
    enrichment: EnrichmentPipeline,
    externalMergers: ExternalLauncherMerger[],
    apiKeyProvider: ApiKeyProvider,
  ) {
    this.gameRepo = GameRepository.getInstance();
    this.enrichment = enrichment;
    this.externalMergers = externalMergers;
    this.apiKeyProvider = apiKeyProvider;

    // Register one strategy per store
    this.strategies = new Map<StoreType, SyncStrategy>([
      ["epic", new EpicSyncStrategy()],
      ["gog", new GogSyncStrategy()],
      ["amazon", new AmazonSyncStrategy()],
      ["steam", new SteamSyncStrategy()],
    ]);
  }

  /**
   * Get or create the singleton instance.
   * On first call, wires the concrete implementations.
   */
  static getInstance(): GameSyncService {
    if (!GameSyncService.instance) {
      GameSyncService.instance = new GameSyncService(
        EnrichmentService.getInstance(),
        [HeroicImportService.getInstance()],
        { getApiKeys, getIGDBAccessToken },
      );
    }
    return GameSyncService.instance;
  }

  /**
   * Create an instance with custom dependencies (for testing).
   */
  static createWithDeps(
    enrichment: EnrichmentPipeline,
    externalMergers: ExternalLauncherMerger[],
    apiKeyProvider: ApiKeyProvider,
  ): GameSyncService {
    return new GameSyncService(enrichment, externalMergers, apiKeyProvider);
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

        const games = await this.fetchViaStrategy(store);

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
        } else {
          await warn(
            `${this.getStoreName(store)}: 0 games returned (not authenticated or fetch failed)`,
          );
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

    // ===== Phase 1.5: Merge external launcher installations =====
    // External launchers (Heroic, etc.) install games independently.
    // We match installed games by storeId and update their install_path.
    for (const merger of this.externalMergers) {
      try {
        const { scanned, merged } = await merger.mergeInstallations();
        if (scanned > 0) {
          await this.emitProgress({
            store: merger.name,
            gameTitle: "",
            current: 0,
            total: scanned,
            phase: "fetching",
            message: `Détection des jeux ${merger.name}...`,
          });

          if (merged > 0) {
            result.updated += merged;
          }

          await this.emitProgress({
            store: merger.name,
            gameTitle: "",
            current: scanned,
            total: scanned,
            phase: "fetching",
            message: `${merger.name}: ${merged} jeux mis à jour`,
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`[${merger.name}] Failed to merge installations: ${msg}`);
        result.errors.push({ store: undefined, phase: "fetch", message: `${merger.name}: ${msg}` });
      }
    }

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

  // ===== Store Fetching (via strategies) =====

  /**
   * Fetch games from a specific store using its SyncStrategy.
   * Checks authentication before attempting to fetch.
   */
  private async fetchViaStrategy(store: StoreType): Promise<Game[]> {
    const strategy = this.strategies.get(store);
    if (!strategy) {
      await warn(`No sync strategy registered for store: ${store}`);
      return [];
    }

    const isAuth = await strategy.isAuthenticated();
    if (!isAuth) {
      return [];
    }

    return strategy.fetchGames();
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

    // Auto-invalidate outdated cache entries (version mismatch)
    // This also resets enriched_at for affected games in the DB.
    const invalidated = await this.enrichment.invalidateOutdatedCache();

    // If cache was invalidated, re-read games from DB to get cleared enriched_at
    let currentGames = games;
    if (invalidated > 0) {
      await info(`Re-enriching ${invalidated} games after cache version upgrade`);
      currentGames = await this.gameRepo.getAllGames();
    }

    // Filter to only games that need enrichment (unless forced)
    const gamesToEnrich = forceEnrich ? currentGames : currentGames.filter((g) => !g.enrichedAt);

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
          store: game.storeData.store,
          gameTitle: game.info.title,
          current: i + 1,
          total: gamesToEnrich.length,
          phase: "enriching",
          message: `Enrichissement: ${game.info.title}`,
        });

        // EnrichmentService handles caching internally (enrichment_cache table)
        const enriched = await this.enrichment.enrichGame(game);

        // Persist enrichment data to the games table (flat DB columns)
        await this.gameRepo.updateEnrichment(game.id, {
          description: enriched.info.description,
          summary: enriched.info.summary,
          metacritic_score: enriched.info.metacriticScore,
          igdb_rating: enriched.info.igdbRating,
          developer: enriched.info.developer,
          publisher: enriched.info.publisher,
          genres: enriched.info.genres,
          release_date: enriched.info.releaseDate,
          hltb_main: enriched.gameCompletion.timeToBeatHastily,
          hltb_main_extra: enriched.gameCompletion.timeToBeatNormally,
          hltb_complete: enriched.gameCompletion.timeToBeatCompletely,
          proton_tier: enriched.protonData.protonTier,
          proton_confidence: enriched.protonData.protonConfidence,
          proton_trending_tier: enriched.protonData.protonTrendingTier,
          steam_app_id: enriched.protonData.steamAppId || null,
          hero_path: enriched.assets.heroPath || null,
          cover_path: enriched.assets.coverPath || null,
          grid_path: enriched.assets.gridPath || null,
          horizontal_grid_path: enriched.assets.horizontalGridPath || null,
          logo_path: enriched.assets.logoPath || null,
          icon_path: enriched.assets.iconPath || null,
          screenshot_paths: enriched.assets.screenshotPaths,
          enriched_at: enriched.enrichedAt,
        });

        enrichedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`Failed to enrich "${game.info.title}": ${msg}`);
        errors.push({ gameTitle: game.info.title, phase: "enrich", message: msg });
        // Continue with next game — don't stop on enrichment failure
      }
    }

    return enrichedCount;
  }

  /**
   * Configure enrichment service with API keys
   * Uses the injected ApiKeyProvider for key resolution
   */
  private async configureEnrichment(): Promise<void> {
    try {
      const apiKeys = await this.apiKeyProvider.getApiKeys();
      const igdbToken = await this.apiKeyProvider.getIGDBAccessToken();

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
   * Get human-readable store name (from strategy or fallback)
   */
  private getStoreName(store: StoreType | string): string {
    const strategy = this.strategies.get(store as StoreType);
    if (strategy) return strategy.displayName;

    const names: Record<string, string> = {
      epic: "Epic Games",
      gog: "GOG",
      amazon: "Amazon Games",
      steam: "Steam",
    };
    return names[store] || store;
  }
}
