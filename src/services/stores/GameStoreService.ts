/**
 * GameStoreService - Abstract base class for store services
 * Provides common functionality for listing and saving games
 */

import type { Game } from "@/types";
import { DatabaseService } from "../base/DatabaseService";
import { SidecarService } from "../base/SidecarService";

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
  abstract get storeName(): Game["store"];

  /**
   * Save games to database (upsert) - internal use
   */
  protected async saveGames(games: Game[]): Promise<void> {
    const sql = `
      INSERT INTO games (
        id, store_id, store, title, installed, install_path, install_size,
        executable_path, genres, play_time_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        installed = excluded.installed,
        install_path = excluded.install_path,
        install_size = excluded.install_size,
        executable_path = excluded.executable_path,
        updated_at = excluded.updated_at
    `;

    for (const game of games) {
      await this.db.execute(sql, [
        game.id,
        game.storeId,
        game.store,
        game.title,
        game.installed ? 1 : 0,
        game.installPath ?? null,
        game.installSize ?? null,
        game.executablePath ?? null,
        JSON.stringify(game.genres),
        game.playTimeMinutes,
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
   * Convert a database row to a Game object
   */
  protected rowToGame(row: Record<string, unknown>): Game {
    return {
      id: row.id as string,
      storeId: row.store_id as string,
      store: row.store as Game["store"],
      title: row.title as string,
      installed: Boolean(row.installed),
      installPath: row.install_path as string | undefined,
      installSize: row.install_size as string | undefined,
      executablePath: row.executable_path as string | undefined,
      customExecutable: row.custom_executable as string | undefined,
      winePrefix: row.wine_prefix as string | undefined,
      wineVersion: row.wine_version as string | undefined,
      runner: row.runner as string | undefined,
      description: row.description as string | undefined,
      summary: row.summary as string | undefined,
      metacriticScore: row.metacritic_score as number | undefined,
      igdbRating: row.igdb_rating as number | undefined,
      developer: row.developer as string | undefined,
      publisher: row.publisher as string | undefined,
      genres: JSON.parse((row.genres as string) || "[]"),
      releaseDate: row.release_date as string | undefined,
      hltbMain: row.hltb_main as number | undefined,
      hltbMainExtra: row.hltb_main_extra as number | undefined,
      hltbComplete: row.hltb_complete as number | undefined,
      hltbSpeedrun: row.hltb_speedrun as number | undefined,
      protonTier: row.proton_tier as Game["protonTier"],
      protonConfidence: row.proton_confidence as string | undefined,
      protonTrendingTier: row.proton_trending_tier as string | undefined,
      steamAppId: row.steam_app_id as number | undefined,
      achievementsTotal: row.achievements_total as number | undefined,
      achievementsUnlocked: row.achievements_unlocked as number | undefined,
      heroPath: row.hero_path as string | undefined,
      gridPath: row.grid_path as string | undefined,
      logoPath: row.logo_path as string | undefined,
      iconPath: row.icon_path as string | undefined,
      coverUrl: row.cover_url as string | undefined,
      backgroundUrl: row.background_url as string | undefined,
      playTimeMinutes: (row.play_time_minutes as number) || 0,
      lastPlayed: row.last_played as string | undefined,
      downloading: Boolean(row.downloading),
      downloadProgress: row.download_progress as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      enrichedAt: row.enriched_at as string | undefined,
    };
  }
}
