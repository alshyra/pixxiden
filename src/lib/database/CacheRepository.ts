/**
 * CacheRepository - Enrichment cache operations
 * Manages the enrichment_cache table for API response caching
 *
 * Cache entries are keyed by (game_id, provider) and store raw API JSON.
 * This allows re-processing enrichment data without re-fetching from APIs.
 */

import { DatabaseService } from "@/services/base/DatabaseService";

const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class CacheRepository {
  private static instance: CacheRepository | null = null;

  private constructor(private db: DatabaseService) {}

  static getInstance(): CacheRepository {
    if (!CacheRepository.instance) {
      CacheRepository.instance = new CacheRepository(DatabaseService.getInstance());
    }
    return CacheRepository.instance;
  }

  /**
   * Get cached data for a game + provider
   */
  async get<T = unknown>(gameId: string, provider: string): Promise<T | null> {
    const row = await this.db.queryOne<{ data: string }>(
      "SELECT data FROM enrichment_cache WHERE game_id = ? AND provider = ?",
      [gameId, provider],
    );
    if (!row?.data) return null;
    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set cached data for a game + provider
   */
  async set(gameId: string, provider: string, data: unknown): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO enrichment_cache (game_id, provider, data, fetched_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [gameId, provider, JSON.stringify(data)],
    );
  }

  /**
   * Get cached data only if still valid (not expired)
   */
  async getIfValid<T = unknown>(
    gameId: string,
    provider: string,
    ttlMs: number = DEFAULT_CACHE_TTL_MS,
  ): Promise<T | null> {
    const row = await this.db.queryOne<{ data: string; fetched_at: string }>(
      "SELECT data, fetched_at FROM enrichment_cache WHERE game_id = ? AND provider = ?",
      [gameId, provider],
    );
    if (!row?.data || !row?.fetched_at) return null;

    const fetchedTime = new Date(row.fetched_at).getTime();
    if (Date.now() - fetchedTime >= ttlMs) return null;

    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache for a specific game (all providers)
   */
  async clearForGame(gameId: string): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache WHERE game_id = ?", [gameId]);
  }

  /**
   * Clear cache for a specific provider (all games)
   */
  async clearForProvider(provider: string): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache WHERE provider = ?", [provider]);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    await this.db.execute("DELETE FROM enrichment_cache");
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalEntries: number; byProvider: Record<string, number> }> {
    const total = await this.db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM enrichment_cache",
    );

    const byProvider: Record<string, number> = {};
    const providerRows = await this.db.select<{ provider: string; count: number }>(
      "SELECT provider, COUNT(*) as count FROM enrichment_cache GROUP BY provider",
    );
    for (const row of providerRows) {
      byProvider[row.provider] = row.count;
    }

    return {
      totalEntries: total?.count ?? 0,
      byProvider,
    };
  }
}
