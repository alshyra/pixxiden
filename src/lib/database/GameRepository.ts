/**
 * GameRepository - Pure TypeScript CRUD for the games table
 * Uses @tauri-apps/plugin-sql via DatabaseService
 *
 * This is the single source of truth for reading/writing game data.
 * All game queries go through here — no Rust invoke needed.
 */

import type { Game, StoreType, ProtonTier } from "@/types";
import { DatabaseService } from "@/services/base/DatabaseService";
import type { OverridableAssetType } from "./ImageOverrideRepository";

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
    const games = rows.map(this.rowToGame);
    return this.applyImageOverrides(games);
  }

  /**
   * Get a single game by ID
   */
  async getGameById(id: string): Promise<Game | null> {
    const row = await this.db.queryOne<Record<string, unknown>>(
      "SELECT * FROM games WHERE id = ?",
      [id],
    );
    if (!row) return null;
    const game = this.rowToGame(row);
    const [withOverrides] = await this.applyImageOverrides([game]);
    return withOverrides;
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
        executable_path, developer, genres, play_time_minutes, cloud_save_support,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        installed = excluded.installed,
        install_path = excluded.install_path,
        install_size = excluded.install_size,
        executable_path = excluded.executable_path,
        developer = COALESCE(games.developer, excluded.developer),
        cloud_save_support = excluded.cloud_save_support,
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
        game.installation.cloudSaveSupport ? 1 : 0,
        game.createdAt || new Date().toISOString(),
        game.updatedAt || new Date().toISOString(),
      ],
    );
  }

  /**
   * Upsert multiple games sequentially.
   *
   * Note: We intentionally do NOT wrap this in a BEGIN/COMMIT transaction.
   * @tauri-apps/plugin-sql uses sqlx::SqlitePool under the hood, so each
   * execute() call may land on a different pooled connection. Explicit
   * BEGIN TRANSACTION on connection A + INSERT on connection B leaves A
   * with an uncommitted lock → SQLITE_BUSY (code 5) for all other queries.
   * Individual upserts with WAL mode + busy_timeout are safe and performant.
   */
  async upsertGames(games: Game[]): Promise<void> {
    if (games.length === 0) return;
    for (const game of games) {
      await this.upsertGame(game);
    }
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
   * Update installation data for a game (install_path, install_size, installed flag).
   * Used by HeroicImportService to merge external installation info.
   * Only updates if the game exists — does nothing otherwise.
   */
  async updateInstallation(
    gameId: string,
    data: {
      installed: boolean;
      installPath: string;
      installSize?: string;
      winePrefix?: string;
      wineVersion?: string;
      runner?: string;
      runnerPath?: string;
      executablePath?: string;
    },
  ): Promise<void> {
    await this.db.execute(
      `UPDATE games SET
        installed = ?,
        install_path = ?,
        install_size = COALESCE(?, install_size),
        wine_prefix = COALESCE(?, wine_prefix),
        wine_version = COALESCE(?, wine_version),
        runner = COALESCE(?, runner),
        runner_path = COALESCE(?, runner_path),
        executable_path = COALESCE(?, executable_path),
        updated_at = ?
      WHERE id = ?`,
      [
        data.installed ? 1 : 0,
        data.installPath,
        data.installSize || null,
        data.winePrefix || null,
        data.wineVersion || null,
        data.runner || null,
        data.runnerPath || null,
        data.executablePath || null,
        new Date().toISOString(),
        gameId,
      ],
    );
  }

  /**
   * Delete a game by ID
   */
  async deleteGame(id: string): Promise<void> {
    await this.db.execute("DELETE FROM games WHERE id = ?", [id]);
  }

  // ===== Image Override Application =====

  /**
   * Apply image overrides from image_overrides table on top of game assets.
   * Uses a batch query via this.db to avoid N+1 when loading the full library.
   * Queries the table directly (instead of via ImageOverrideRepository) to use
   * the same injected db instance — keeps tests simple with a single mock.
   */
  private async applyImageOverrides(games: Game[]): Promise<Game[]> {
    if (games.length === 0) return games;

    const gameIds = games.map((g) => g.id);
    const placeholders = gameIds.map(() => "?").join(",");

    const rows = await this.db.select<Record<string, unknown>>(
      `SELECT game_id, asset_type, path FROM image_overrides WHERE game_id IN (${placeholders})`,
      gameIds,
    );

    if (rows.length === 0) return games;

    // Group overrides by game_id
    const overridesMap = new Map<string, { assetType: OverridableAssetType; path: string }[]>();
    for (const row of rows) {
      const gameId = row.game_id as string;
      const entry = { assetType: row.asset_type as OverridableAssetType, path: row.path as string };
      const existing = overridesMap.get(gameId) || [];
      existing.push(entry);
      overridesMap.set(gameId, existing);
    }

    const assetMapping: Record<OverridableAssetType, keyof Game["assets"]> = {
      hero: "heroPath",
      grid: "gridPath",
      horizontal_grid: "horizontalGridPath",
      logo: "logoPath",
      icon: "iconPath",
    };

    for (const game of games) {
      const overrides = overridesMap.get(game.id);
      if (!overrides) continue;
      for (const ov of overrides) {
        const key = assetMapping[ov.assetType];
        if (key && typeof game.assets[key] === "string") {
          (game.assets[key] as string) = ov.path;
        }
      }
    }

    return games;
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
        gridPath: (row.grid_path as string) || "",
        horizontalGridPath: (row.horizontal_grid_path as string) || "",
        logoPath: (row.logo_path as string) || "",
        iconPath: (row.icon_path as string) || "",
        screenshotPaths: JSON.parse((row.screenshot_paths as string) || "[]"),
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
        runnerPath: (row.runner_path as string) || "",
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
