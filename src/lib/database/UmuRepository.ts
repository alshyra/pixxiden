/**
 * UmuRepository - Local SQLite cache for the umu-launcher API database
 *
 * Instead of making hundreds of individual HTTP requests to umu_api.php
 * during game sync, we bulk-fetch the entire UMU database (~2000 entries)
 * and store it locally. Lookups become instant SQLite queries.
 *
 * Refresh strategy: re-sync weekly or on manual trigger.
 */

import { DatabaseService } from "@/services/base/DatabaseService";
import { info, warn } from "@tauri-apps/plugin-log";
import type { UmuEntry } from "@/services/runners/UmuLauncherService";

/** How often to refresh the UMU database (7 days) */
const UMU_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const UMU_API_URL = "https://umu.openwinecomponents.org/umu_api.php";

export class UmuRepository {
  private static instance: UmuRepository | null = null;

  private constructor(private db: DatabaseService) {}

  static getInstance(): UmuRepository {
    if (!UmuRepository.instance) {
      UmuRepository.instance = new UmuRepository(DatabaseService.getInstance());
    }
    return UmuRepository.instance;
  }

  /**
   * Check if the local UMU database needs refreshing.
   * Returns true if the database is empty or older than UMU_REFRESH_INTERVAL_MS.
   */
  async needsRefresh(): Promise<boolean> {
    const row = await this.db.queryOne<{ count: number; oldest: string | null }>(
      "SELECT COUNT(*) as count, MIN(updated_at) as oldest FROM umu_database",
    );

    if (!row || row.count === 0) return true;

    if (row.oldest) {
      const age = Date.now() - new Date(row.oldest).getTime();
      return age > UMU_REFRESH_INTERVAL_MS;
    }

    return true;
  }

  /**
   * Fetch the entire UMU database from the API and store locally.
   * Single HTTP request replaces 500+ individual lookups.
   * Returns the number of entries stored.
   */
  async syncFromApi(): Promise<number> {
    const { fetch } = await import("@tauri-apps/plugin-http");

    await info("[UMU-DB] Fetching full UMU database from API...");
    const response = await fetch(UMU_API_URL);

    if (!response.ok) {
      throw new Error(`UMU API returned ${response.status}`);
    }

    const entries: UmuEntry[] = await response.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      await warn("[UMU-DB] API returned empty or invalid data");
      return 0;
    }

    await info(`[UMU-DB] Received ${entries.length} entries, writing to SQLite...`);

    // Batch insert/replace in a single transaction for performance
    const now = new Date().toISOString();
    const batchSize = 100;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = batch.flatMap((e) => [
        e.umu_id,
        e.title,
        e.codename || null,
        e.store || null,
        e.acronym || null,
        e.exe_string || null,
        e.notes || null,
        now,
      ]);

      await this.db.execute(
        `INSERT OR REPLACE INTO umu_database (umu_id, title, codename, store, acronym, exe_string, notes, updated_at) VALUES ${placeholders}`,
        values,
      );
    }

    await info(`[UMU-DB] Stored ${entries.length} UMU entries in local database`);
    return entries.length;
  }

  /**
   * Look up a UMU entry by codename (store-specific game ID).
   * This is the primary lookup method — instant SQLite query.
   */
  async findByCodename(codename: string): Promise<UmuEntry | null> {
    const row = await this.db.queryOne<UmuDbRow>(
      "SELECT * FROM umu_database WHERE codename = ? LIMIT 1",
      [codename],
    );
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Look up a UMU entry by umu_id (e.g. "umu-1086940").
   */
  async findByUmuId(umuId: string): Promise<UmuEntry | null> {
    const row = await this.db.queryOne<UmuDbRow>(
      "SELECT * FROM umu_database WHERE umu_id = ? LIMIT 1",
      [umuId],
    );
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Look up a UMU entry by title (case-insensitive LIKE search).
   */
  async findByTitle(title: string): Promise<UmuEntry | null> {
    // Try exact match first
    let row = await this.db.queryOne<UmuDbRow>(
      "SELECT * FROM umu_database WHERE title = ? COLLATE NOCASE LIMIT 1",
      [title],
    );
    if (row) return this.rowToEntry(row);

    // Fall back to LIKE search
    row = await this.db.queryOne<UmuDbRow>(
      "SELECT * FROM umu_database WHERE title LIKE ? COLLATE NOCASE LIMIT 1",
      [`%${title}%`],
    );
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Get total count of entries in the local database.
   */
  async getCount(): Promise<number> {
    const row = await this.db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM umu_database",
    );
    return row?.count ?? 0;
  }

  // ===== Private Helpers =====

  private rowToEntry(row: UmuDbRow): UmuEntry {
    return {
      umu_id: row.umu_id,
      title: row.title,
      codename: row.codename || "",
      store: row.store || "",
      acronym: row.acronym || "",
      exe_string: row.exe_string || null,
      notes: row.notes || null,
    };
  }
}

interface UmuDbRow {
  umu_id: string;
  title: string;
  codename: string | null;
  store: string | null;
  acronym: string | null;
  exe_string: string | null;
  notes: string | null;
  updated_at: string;
}
