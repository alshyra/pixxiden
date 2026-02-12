import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();
const mockDbClose = vi.fn();
const mockLoad = vi.fn();

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: (...args: unknown[]) => mockLoad(...args),
  },
}));

describe("DatabaseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad.mockResolvedValue({
      execute: (...args: unknown[]) => mockDbExecute(...args),
      select: (...args: unknown[]) => mockDbSelect(...args),
      close: (...args: unknown[]) => mockDbClose(...args),
    });
  });

  it("initializes database and runs pragmas/schema", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });

    await db.init();

    expect(mockLoad).toHaveBeenCalledWith("sqlite:pixxiden.db");
    expect(mockDbExecute).toHaveBeenCalledWith("PRAGMA journal_mode=WAL");
    expect(mockDbExecute).toHaveBeenCalledWith("PRAGMA busy_timeout=5000");
  });

  it("does not init twice", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });

    await db.init();
    await db.init();

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it("throws when querying before init", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();

    await expect(db.execute("SELECT 1")).rejects.toThrow("Database not initialized");
    await expect(db.select("SELECT 1")).rejects.toThrow("Database not initialized");
  });

  it("executes and selects after init", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 2 });
    mockDbSelect.mockResolvedValue([{ id: 1 }]);

    await db.init();

    const result = await db.execute("UPDATE t SET a=1");
    const rows = await db.select<{ id: number }>("SELECT id FROM t");
    const one = await db.queryOne<{ id: number }>("SELECT id FROM t");

    expect(result.rowsAffected).toBe(2);
    expect(rows).toEqual([{ id: 1 }]);
    expect(one).toEqual({ id: 1 });
  });

  it("queryOne returns null for empty rows", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });
    mockDbSelect.mockResolvedValue([]);

    await db.init();
    await expect(db.queryOne("SELECT id FROM t")).resolves.toBeNull();
  });

  it("transaction commits on success", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });

    await db.init();

    const value = await db.transaction(async () => 42);
    expect(value).toBe(42);
    expect(mockDbExecute).toHaveBeenCalledWith("BEGIN TRANSACTION", []);
    expect(mockDbExecute).toHaveBeenCalledWith("COMMIT", []);
  });

  it("transaction rolls back on failure", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });

    await db.init();

    await expect(
      db.transaction(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(mockDbExecute).toHaveBeenCalledWith("ROLLBACK", []);
  });

  it("closes database and resets state", async () => {
    const { DatabaseService } = await import("@/services/base/DatabaseService");
    (DatabaseService as any).instance = null;

    const db = DatabaseService.getInstance();
    mockDbExecute.mockResolvedValue({ rowsAffected: 0 });

    await db.init();
    await db.close();

    expect(mockDbClose).toHaveBeenCalled();
    await expect(db.execute("SELECT 1")).rejects.toThrow("Database not initialized");
  });
});
