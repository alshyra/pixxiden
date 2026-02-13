/**
 * GameLibraryOrchestrator - Main facade for game library operations
 *
 * Delegates to:
 * - GameRepository (all database reads/writes — pure TypeScript)
 * - GameSyncService (sync + enrichment pipeline via SyncStrategies)
 * - LaunchCommandBuilder (game launch preparation via LaunchStrategies)
 * - Store services (authentication status checks)
 *
 * This orchestrator contains NO Rust invoke calls.
 * All data flows through SQLite via @tauri-apps/plugin-sql.
 */

import type { Game, StoreType } from "@/types";
import { GameRepository } from "@/lib/database";
import { GameSyncService, type SyncOptions, type SyncResult } from "@/lib/sync";
import { DatabaseService } from "./base";
import { LegendaryService, GogdlService, NileService } from "./stores";
import type { StoreCapabilities } from "./stores";
import { LaunchCommandBuilder, type PreparedLaunch } from "./launch";
import { info } from "@tauri-apps/plugin-log";

export type { SyncResult, SyncOptions };

export interface StoreStatus {
  store: StoreType;
  authenticated: boolean;
  gamesCount: number;
  lastSync: Date | null;
  capabilities: StoreCapabilities;
}

export class GameLibraryOrchestrator {
  private static instance: GameLibraryOrchestrator | null = null;

  private gameRepo: GameRepository;
  private syncService: GameSyncService;
  private launchBuilder: LaunchCommandBuilder;
  private legendary: LegendaryService;
  private gogdl: GogdlService;
  private nile: NileService;

  private constructor() {
    this.gameRepo = GameRepository.getInstance();
    this.syncService = GameSyncService.getInstance();
    this.launchBuilder = LaunchCommandBuilder.getInstance();
    this.legendary = LegendaryService.getInstance();
    this.gogdl = GogdlService.getInstance();
    this.nile = NileService.getInstance();
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
      {
        store: "epic",
        authenticated: epicAuth,
        gamesCount: epicCount,
        lastSync: null,
        capabilities: this.legendary.getCapabilities(),
      },
      {
        store: "gog",
        authenticated: gogAuth,
        gamesCount: gogCount,
        lastSync: null,
        capabilities: this.gogdl.getCapabilities(),
      },
      {
        store: "amazon",
        authenticated: amazonAuth,
        gamesCount: amazonCount,
        lastSync: null,
        capabilities: this.nile.getCapabilities(),
      },
      {
        store: "steam",
        authenticated: true,
        gamesCount: steamCount,
        lastSync: null,
        capabilities: {
          canListGames: false,
          canInstall: true,
          canLaunch: true,
          canGetInfo: false,
          canSyncSaves: false,
        },
      },
    ];
  }

  // ===== Game Launch (delegates to LaunchCommandBuilder) =====

  /**
   * Prepare game launch data (command + env vars)
   * All Proton resolution, strategy selection, and umu-run detection
   * is handled by LaunchCommandBuilder.
   */
  async prepareGameLaunch(gameId: string): Promise<PreparedLaunch> {
    return this.launchBuilder.prepareLaunch(gameId);
  }

  // ===== Cloud Save Sync =====

  /**
   * Sync cloud saves for a game (currently only GOG via gogdl save-sync)
   */
  async syncSaves(gameId: string): Promise<void> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    if (game.storeData.store === "gog" && game.installation.installed) {
      await this.gogdl.syncSaves(game.storeData.storeId, game.installation.installPath);
    }
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
   * Update the executable path for a game (used for umu-run direct launch)
   * This is the Windows .exe path that umu-run will execute.
   */
  async updateExecutablePath(gameId: string, executablePath: string): Promise<void> {
    await this.gameRepo.updateEnrichment(gameId, { executable_path: executablePath });
    await info(`[Orchestrator] Updated executable_path for ${gameId}: ${executablePath}`);
  }

  /**
   * Remove a game from library (does not uninstall)
   */
  async removeGameFromLibrary(gameId: string): Promise<void> {
    await this.gameRepo.deleteGame(gameId);
  }
}
