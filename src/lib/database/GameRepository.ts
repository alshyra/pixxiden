/**
 * GameRepository - Pure TypeScript CRUD for the games table
 * Uses @tauri-apps/plugin-sql via DatabaseService
 *
 * This is the single source of truth for reading/writing game data.
 * All game queries go through here — no Rust invoke needed.
 */

import type { Game, StoreType, ProtonTier } from "@/types";
import { DatabaseService } from "@/services/base/DatabaseService";

export class GameRepository {
  private static instance: GameRepository | null = null;

  private constructor(private db: DatabaseService) {}

  static getInstance(): GameRepository {
    if (!GameRepository.instance) {
      GameRepository.instance = new GameRepository(DatabaseService.getInstance());
    }
    return GameRepository.instance;
  }

  // ===== Read Operations =====

  /**
   * Get all games from the database
   */
  async getAllGames(): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games ORDER BY title ASC",
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Get a single game by ID
   */
  async getGameById(id: string): Promise<Game | null> {
    const row = await this.db.queryOne<Record<string, unknown>>(
      "SELECT * FROM games WHERE id = ?",
      [id],
    );
    return row ? this.rowToGame(row) : null;
  }

  /**
   * Get games filtered by store
   */
  async getGamesByStore(store: StoreType): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE store = ? ORDER BY title ASC",
      [store],
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Get total number of games
   */
  async getGamesCount(): Promise<number> {
    const row = await this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM games");
    return row?.count ?? 0;
  }

  /**
   * Get games that need enrichment (enriched_at is NULL)
   */
  async getUnenrichedGames(): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE enriched_at IS NULL ORDER BY title ASC",
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Get recently played games
   */
  async getRecentlyPlayed(limit: number = 10): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE last_played IS NOT NULL ORDER BY last_played DESC LIMIT ?",
      [limit],
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Get favorite games
   */
  async getFavorites(): Promise<Game[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE is_favorite = 1 ORDER BY title ASC",
    );
    return rows.map(this.rowToGame);
  }

  /**
   * Search games by title or developer
   */
  async searchGames(query: string): Promise<Game[]> {
    const pattern = `%${query}%`;
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT * FROM games WHERE title LIKE ? OR developer LIKE ? ORDER BY title ASC",
      [pattern, pattern],
    );
    return rows.map(this.rowToGame);
  }

  // ===== Write Operations =====

  /**
   * Upsert a single game (insert or update on conflict)
   * Only updates base store data — never overwrites enrichment fields
   */
  async upsertGame(game: Game): Promise<void> {
    await this.db.execute(
      `INSERT INTO games (
        id, store_id, store, title, installed, install_path, install_size,
        executable_path, developer, genres, play_time_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        installed = excluded.installed,
        install_path = excluded.install_path,
        install_size = excluded.install_size,
        executable_path = excluded.executable_path,
        developer = COALESCE(games.developer, excluded.developer),
        updated_at = excluded.updated_at`,
      [
        game.id,
        game.storeData.storeId,
        game.storeData.store,
        game.info.title,
        game.installation.installed ? 1 : 0,
        game.installation.installPath || null,
        game.installation.installSize || null,
        game.installation.executablePath || null,
        game.info.developer || null,
        JSON.stringify(game.info.genres || []),
        game.gameCompletion.playTimeMinutes || 0,
        game.createdAt || new Date().toISOString(),
        game.updatedAt || new Date().toISOString(),
      ],
    );
  }

  /**
   * Upsert multiple games in a transaction
   */
  async upsertGames(games: Game[]): Promise<void> {
    if (games.length === 0) return;
    await this.db.transaction(async () => {
      for (const game of games) {
        await this.upsertGame(game);
      }
    });
  }

  /**
   * Update enrichment data for a game
   * Accepts a flat map of DB column names → values for flexibility
   */
  async updateEnrichment(gameId: string, data: Record<string, unknown>): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [column, value] of Object.entries(data)) {
      if (value !== undefined) {
        setClauses.push(`${column} = ?`);
        if (Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) return;

    setClauses.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(gameId);

    await this.db.execute(`UPDATE games SET ${setClauses.join(", ")} WHERE id = ?`, values);
  }

  /**
   * Update game metadata (favorites, playtime, last played)
   */
  async updateMetadata(
    gameId: string,
    updates: {
      isFavorite?: boolean;
      playTimeMinutes?: number;
      lastPlayed?: string;
    },
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.isFavorite !== undefined) {
      setClauses.push("is_favorite = ?");
      values.push(updates.isFavorite ? 1 : 0);
    }
    if (updates.playTimeMinutes !== undefined) {
      setClauses.push("play_time_minutes = ?");
      values.push(updates.playTimeMinutes);
    }
    if (updates.lastPlayed !== undefined) {
      setClauses.push("last_played = ?");
      values.push(updates.lastPlayed);
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(gameId);
      await this.db.execute(`UPDATE games SET ${setClauses.join(", ")} WHERE id = ?`, values);
    }
  }

  /**
   * Delete a game by ID
   */
  async deleteGame(id: string): Promise<void> {
    await this.db.execute("DELETE FROM games WHERE id = ?", [id]);
  }

  // ===== Row Mapping =====

  /**
   * Convert a database row (flat columns) to a nested Game object
   */
  private rowToGame(row: Record<string, unknown>): Game {
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
        gridPath: (row.grid_path as string) || "",
        logoPath: (row.logo_path as string) || "",
        iconPath: (row.icon_path as string) || "",
        screenshotPaths: JSON.parse((row.screenshot_paths as string) || "[]"),
        backgroundUrl: (row.background_url as string) || "",
      },
      installation: {
        installed: Boolean(row.installed),
        installPath: (row.install_path as string) || "",
        installSize: (row.install_size as string) || "",
        customExecutable: (row.custom_executable as string) || "",
        winePrefix: (row.wine_prefix as string) || "",
        wineVersion: (row.wine_version as string) || "",
        executablePath: (row.executable_path as string) || "",
        customExecutablePath: "",
        runner: (row.runner as string) || "",
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
