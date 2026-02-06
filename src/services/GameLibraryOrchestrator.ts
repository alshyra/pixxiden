/**
 * GameLibraryOrchestrator - Main facade for game library operations
 *
 * Delegates to:
 * - GameRepository (all database reads/writes — pure TypeScript)
 * - GameSyncService (sync + enrichment pipeline)
 * - Store services (authentication status checks)
 *
 * This orchestrator contains NO Rust invoke calls.
 * All data flows through SQLite via @tauri-apps/plugin-sql.
 */

import type { Game, StoreType } from "@/types";
import { GameRepository } from "@/lib/database";
import { GameSyncService, type SyncOptions, type SyncResult } from "@/lib/sync";
import { DatabaseService, SidecarService } from "./base";
import { LegendaryService, GogdlService, NileService } from "./stores";

export type { SyncResult, SyncOptions };

export interface StoreStatus {
  store: StoreType;
  authenticated: boolean;
  gamesCount: number;
  lastSync: Date | null;
}

export class GameLibraryOrchestrator {
  private static instance: GameLibraryOrchestrator | null = null;

  private gameRepo: GameRepository;
  private syncService: GameSyncService;
  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;

  private constructor() {
    const db = DatabaseService.getInstance();
    const sidecar = SidecarService.getInstance();

    this.gameRepo = GameRepository.getInstance();
    this.syncService = GameSyncService.getInstance();
    this.legendary = new LegendaryService(sidecar, db);
    this.gogdl = new GogdlService(sidecar, db);
    this.nile = new NileService(sidecar, db);
  }

  static getInstance(): GameLibraryOrchestrator {
    if (!GameLibraryOrchestrator.instance) {
      GameLibraryOrchestrator.instance = new GameLibraryOrchestrator();
    }
    return GameLibraryOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator and database
   */
  async initialize(): Promise<void> {
    await DatabaseService.getInstance().init();
  }

  // ===== Game Queries (pure SQLite reads) =====

  /**
   * Get all games from SQLite — no Rust invoke needed
   */
  async getAllGames(): Promise<Game[]> {
    return this.gameRepo.getAllGames();
  }

  /**
   * Get a single game by ID
   */
  async getGameById(gameId: string): Promise<Game | null> {
    return this.gameRepo.getGameById(gameId);
  }

  /**
   * Get games by store
   */
  async getGamesByStore(store: StoreType): Promise<Game[]> {
    return this.gameRepo.getGamesByStore(store);
  }

  /**
   * Search games by title or developer (SQL LIKE query)
   */
  async searchGames(query: string): Promise<Game[]> {
    return this.gameRepo.searchGames(query);
  }

  /**
   * Get recently played games
   */
  async getRecentlyPlayed(limit: number = 10): Promise<Game[]> {
    return this.gameRepo.getRecentlyPlayed(limit);
  }

  /**
   * Get favorite games
   */
  async getFavorites(): Promise<Game[]> {
    return this.gameRepo.getFavorites();
  }

  // ===== Sync (delegates to GameSyncService) =====

  /**
   * Sync library with all authenticated stores
   * Fetches games, enriches metadata, persists to SQLite
   */
  async syncLibrary(options?: SyncOptions): Promise<SyncResult> {
    return this.syncService.sync(options);
  }

  // ===== Store Status =====

  /**
   * Get authentication and games status for all stores
   */
  async getStoresStatus(): Promise<StoreStatus[]> {
    const [epicAuth, gogAuth, amazonAuth] = await Promise.all([
      this.legendary.isAuthenticated(),
      this.gogdl.isAuthenticated(),
      this.nile.isAuthenticated(),
    ]);

    const [epicCount, gogCount, amazonCount, steamCount] = await Promise.all([
      this.gameRepo.getGamesByStore("epic").then((g) => g.length),
      this.gameRepo.getGamesByStore("gog").then((g) => g.length),
      this.gameRepo.getGamesByStore("amazon").then((g) => g.length),
      this.gameRepo.getGamesByStore("steam").then((g) => g.length),
    ]);

    return [
      { store: "epic", authenticated: epicAuth, gamesCount: epicCount, lastSync: null },
      { store: "gog", authenticated: gogAuth, gamesCount: gogCount, lastSync: null },
      { store: "amazon", authenticated: amazonAuth, gamesCount: amazonCount, lastSync: null },
      { store: "steam", authenticated: true, gamesCount: steamCount, lastSync: null },
    ];
  }

  // ===== Game Launch =====

  /**
   * Prepare game launch data (command + env vars)
   */
  async prepareGameLaunch(gameId: string): Promise<{
    game: Game;
    launchCommand: string[];
    env: Record<string, string>;
  }> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    return {
      game,
      launchCommand: this.buildLaunchCommand(game),
      env: this.buildLaunchEnv(game),
    };
  }

  private buildLaunchCommand(game: Game): string[] {
    switch (game.store) {
      case "epic":
        return ["legendary", "launch", game.storeId];
      case "gog":
        return ["gogdl", "launch", game.storeId];
      case "amazon":
        return ["nile", "launch", game.storeId];
      case "steam":
        return ["steam", "-applaunch", game.storeId];
      default:
        throw new Error(`Unknown store: ${game.store}`);
    }
  }

  private buildLaunchEnv(_game: Game): Record<string, string> {
    return {};
  }

  // ===== Game Metadata Updates =====

  /**
   * Update game metadata (favorites, playtime, last played)
   */
  async updateGameMetadata(
    gameId: string,
    updates: {
      isFavorite?: boolean;
      playTimeMinutes?: number;
      lastPlayed?: string;
    },
  ): Promise<void> {
    await this.gameRepo.updateMetadata(gameId, updates);
  }

  /**
   * Remove a game from library (does not uninstall)
   */
  async removeGameFromLibrary(gameId: string): Promise<void> {
    await this.gameRepo.deleteGame(gameId);
  }
}
