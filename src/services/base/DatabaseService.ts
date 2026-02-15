/**
 * DatabaseService - Low-level SQLite wrapper
 * Uses @tauri-apps/plugin-sql for persistence
 */

import Database from "@tauri-apps/plugin-sql";
import { info, error as logError } from "@tauri-apps/plugin-log";
import { SCHEMA, MIGRATIONS } from "./schema";

export interface QueryResult<T> {
  rows: T[];
  rowsAffected: number;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection and schema
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await Database.load("sqlite:pixxiden.db");

      // Enable WAL mode for better concurrent access (readers don't block writers)
      // This is critical because @tauri-apps/plugin-sql uses a connection pool
      // and multiple connections can cause SQLITE_BUSY without WAL.
      await this.db.execute("PRAGMA journal_mode=WAL");

      // Set busy timeout to 5 seconds — SQLite will retry automatically
      // instead of immediately returning SQLITE_BUSY (code 5).
      await this.db.execute("PRAGMA busy_timeout=5000");

      // Apply schema
      await this.db.execute(SCHEMA);

      // Apply any pending migrations (errors are expected if already applied)
      for (const migration of MIGRATIONS) {
        try {
          await this.db.execute(migration);
        } catch {
          // Migration likely already applied — safe to ignore
        }
      }

      this.initialized = true;
      await info("Database initialized successfully");
    } catch (error) {
      await logError(`Database initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private ensureInitialized(): Database {
    if (!this.db || !this.initialized) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  /**
   * Execute a SQL query (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: unknown[] = []): Promise<QueryResult<never>> {
    const db = this.ensureInitialized();
    const result = await db.execute(sql, params);
    return {
      rows: [],
      rowsAffected: result.rowsAffected,
    };
  }

  /**
   * Select multiple rows
   */
  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const db = this.ensureInitialized();
    return db.select<T[]>(sql, params);
  }

  /**
   * Select a single row (or null)
   */
  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.select<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Export singleton getter for convenience
export function getDatabase(): DatabaseService {
  return DatabaseService.getInstance();
}
