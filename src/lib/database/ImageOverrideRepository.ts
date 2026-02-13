/**
 * ImageOverrideRepository - Manages user-chosen image overrides
 *
 * When a user manually picks an image for a game (hero, grid, logo, etc.),
 * this override survives re-enrichment cycles. The override path points to
 * a locally-cached file managed by ImageCacheService.
 *
 * Table: image_overrides (game_id, asset_type, path, created_at)
 */

import { DatabaseService } from "@/services/base/DatabaseService";

/**
 * Asset types that can be overridden by the user.
 * Matches the CHECK constraint in the image_overrides table.
 */
export type OverridableAssetType = "hero" | "grid" | "horizontal_grid" | "logo" | "icon" | "cover";

export interface ImageOverride {
  gameId: string;
  assetType: OverridableAssetType;
  path: string;
  createdAt: string;
}

export class ImageOverrideRepository {
  private static instance: ImageOverrideRepository | null = null;

  private constructor(private db: DatabaseService) {}

  static getInstance(): ImageOverrideRepository {
    if (!ImageOverrideRepository.instance) {
      ImageOverrideRepository.instance = new ImageOverrideRepository(DatabaseService.getInstance());
    }
    return ImageOverrideRepository.instance;
  }

  // ===== Read Operations =====

  /**
   * Get all overrides for a single game
   */
  async getOverrides(gameId: string): Promise<ImageOverride[]> {
    const rows = await this.db.select<Record<string, unknown>>(
      "SELECT game_id, asset_type, path, created_at FROM image_overrides WHERE game_id = ?",
      [gameId],
    );
    return rows.map(this.rowToOverride);
  }

  /**
   * Get overrides for multiple games in a single query (batch)
   */
  async getOverridesBatch(gameIds: string[]): Promise<Map<string, ImageOverride[]>> {
    if (gameIds.length === 0) return new Map();

    const placeholders = gameIds.map(() => "?").join(",");
    const rows = await this.db.select<Record<string, unknown>>(
      `SELECT game_id, asset_type, path, created_at
       FROM image_overrides
       WHERE game_id IN (${placeholders})`,
      gameIds,
    );

    const map = new Map<string, ImageOverride[]>();
    for (const row of rows) {
      const override = this.rowToOverride(row);
      const existing = map.get(override.gameId) || [];
      existing.push(override);
      map.set(override.gameId, existing);
    }
    return map;
  }

  /**
   * Get asset types that are locked (overridden) for a game.
   * Used by EnrichmentService to skip downloading images the user has overridden.
   */
  async getLockedAssetTypes(gameId: string): Promise<Set<OverridableAssetType>> {
    const rows = await this.db.select<{ asset_type: string }>(
      "SELECT asset_type FROM image_overrides WHERE game_id = ?",
      [gameId],
    );
    return new Set(rows.map((r) => r.asset_type as OverridableAssetType));
  }

  // ===== Write Operations =====

  /**
   * Set (upsert) an image override for a game + asset type
   */
  async setOverride(gameId: string, assetType: OverridableAssetType, path: string): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO image_overrides (game_id, asset_type, path, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [gameId, assetType, path],
    );
  }

  /**
   * Remove a single override (reverts to enriched image)
   */
  async removeOverride(gameId: string, assetType: OverridableAssetType): Promise<void> {
    await this.db.execute("DELETE FROM image_overrides WHERE game_id = ? AND asset_type = ?", [
      gameId,
      assetType,
    ]);
  }

  /**
   * Remove all overrides for a game
   */
  async removeAllOverrides(gameId: string): Promise<void> {
    await this.db.execute("DELETE FROM image_overrides WHERE game_id = ?", [gameId]);
  }

  // ===== Row Mapping =====

  private rowToOverride(row: Record<string, unknown>): ImageOverride {
    return {
      gameId: row.game_id as string,
      assetType: row.asset_type as OverridableAssetType,
      path: row.path as string,
      createdAt: (row.created_at as string) || new Date().toISOString(),
    };
  }
}
