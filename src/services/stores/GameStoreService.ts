/**
 * GameStoreService - Abstract base class for store services
 *
 * All store services (Legendary, Gogdl, Nile, Steam) extend this class.
 * It provides a unified interface for:
 * - Game listing and persistence
 * - Authentication
 * - Game info retrieval
 * - Launch command building
 * - Cloud save management
 *
 * Subclasses MUST implement: listGames, storeName, isAuthenticated
 * Subclasses SHOULD implement: getGameInfo, hasSaveSync
 */

import type { Game, ProtonTier } from "@/types";
import { DatabaseService } from "../base/DatabaseService";
import { SidecarService } from "../base/SidecarService";

/**
 * Capabilities a store can declare it supports
 */
export interface StoreCapabilities {
  canListGames: boolean;
  canInstall: boolean;
  canLaunch: boolean;
  canGetInfo: boolean;
  canSyncSaves: boolean;
}

export abstract class GameStoreService {
  constructor(
    protected sidecar: SidecarService,
    protected db: DatabaseService,
  ) {}

  /**
   * List games from this store - must be implemented by subclasses
   */
  abstract listGames(): Promise<Game[]>;

  /**
   * Get the store identifier
   */
  abstract get storeName(): Game["storeData"]["store"];

  /**
   * Check if the user is authenticated with this store
   */
  abstract isAuthenticated(): Promise<boolean>;

  /**
   * Build launch command for a game from this store
   * @param game - The game to launch
   * @param protonPath - Resolved Proton binary path (or null)
   * @param cleanEnv - Command prefix to clean Python-related env vars
   * @returns Array of command arguments to execute
   */
  abstract buildLaunchCommand(
    game: Game,
    protonPath: string | null,
    cleanEnv: string,
  ): Promise<string[]>;

  /**
   * Get capabilities of this store
   * Override in subclasses for specific support
   */
  getCapabilities(): StoreCapabilities {
    return {
      canListGames: true,
      canInstall: false,
      canLaunch: false,
      canGetInfo: false,
      canSyncSaves: false,
    };
  }

  /**
   * Save games to database (upsert) - internal use
   */
  protected async saveGames(games: Game[]): Promise<void> {
    const sql = `
      INSERT INTO games (
        id, store_id, store, title, installed, install_path, install_size,
        executable_path, genres, play_time_minutes, cloud_save_support, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        installed = excluded.installed,
        install_path = excluded.install_path,
        install_size = excluded.install_size,
        executable_path = excluded.executable_path,
        cloud_save_support = excluded.cloud_save_support,
        updated_at = excluded.updated_at
    `;

    for (const game of games) {
      await this.db.execute(sql, [
        game.id,
        game.storeData.storeId,
        game.storeData.store,
        game.info.title,
        game.installation.installed ? 1 : 0,
        game.installation.installPath || null,
        game.installation.installSize || null,
        game.installation.executablePath || null,
        JSON.stringify(game.info.genres),
        game.gameCompletion.playTimeMinutes,
        game.installation.cloudSaveSupport ? 1 : 0,
        game.createdAt,
        game.updatedAt,
      ]);
    }
  }

  /**
   * Persist games to database - public API for orchestrator
   */
  async persistGames(games: Game[]): Promise<void> {
    return this.saveGames(games);
  }

  /**
   * Get games from database for this store
   */
  async getStoredGames(): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE store = ?",
      [this.storeName],
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Convert a database row to a nested Game object
   */
  protected rowToGame(row: Record<string, unknown>): Game {
    return {
      id: row.id as string,
      info: {
        title: (row.title as string) || "",
        description: (row.description as string) || "",
        summary: (row.summary as string) || "",
        metacriticScore: (row.metacritic_score as number) || 0,
        igdbRating: (row.igdb_rating as number) || 0,
        developer: (row.developer as string) || "",
        publisher: (row.publisher as string) || "",
        genres: JSON.parse((row.genres as string) || "[]"),
        releaseDate: (row.release_date as string) || "",
      },
      assets: {
        heroPath: (row.hero_path as string) || "",
        coverPath: (row.cover_path as string) || "",
        horizontalGridPath: (row.horizontal_grid_path as string) || "",
        gridPath: (row.grid_path as string) || "",
        logoPath: (row.logo_path as string) || "",
        iconPath: (row.icon_path as string) || "",
        screenshotPaths: JSON.parse((row.screenshot_paths as string) || "[]"),
        backgroundUrl: (row.background_url as string) || "",
      },
      installation: {
        installed: Boolean(row.installed),
        runnerPath: (row.runner_path as string) || "",
        installPath: (row.install_path as string) || "",
        installSize: (row.install_size as string) || "",
        customExecutable: (row.custom_executable as string) || "",
        winePrefix: (row.wine_prefix as string) || "",
        wineVersion: (row.wine_version as string) || "",
        executablePath: (row.executable_path as string) || "",
        customExecutablePath: "",
        runner: (row.runner as string) || "",
        cloudSaveSupport: Boolean(row.cloud_save_support),
      },
      gameCompletion: {
        timeToBeatHastily: (row.hltb_main as number) || 0,
        timeToBeatNormally: (row.hltb_main_extra as number) || 0,
        timeToBeatCompletely: (row.hltb_complete as number) || 0,
        achievementsTotal: row.achievements_total as number | undefined,
        achievementsUnlocked: row.achievements_unlocked as number | undefined,
        playTimeMinutes: (row.play_time_minutes as number) || 0,
        lastPlayed: row.last_played as string | undefined,
        isFavorite: Boolean(row.is_favorite),
        downloading: Boolean(row.downloading),
        downloadProgress: row.download_progress as number | undefined,
      },
      protonData: {
        protonTier: ((row.proton_tier as string) || "pending") as ProtonTier,
        protonConfidence: (row.proton_confidence as string) || "",
        protonTrendingTier: (row.proton_trending_tier as string) || "",
        steamAppId: (row.steam_app_id as number) || 0,
      },
      storeData: {
        store: row.store as Game["storeData"]["store"],
        storeId: (row.store_id as string) || "",
      },
      createdAt: (row.created_at as string) || new Date().toISOString(),
      updatedAt: (row.updated_at as string) || new Date().toISOString(),
      enrichedAt: row.enriched_at as string | undefined,
    };
  }
}
