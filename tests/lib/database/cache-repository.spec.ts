import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheRepository } from "@/lib/database/CacheRepository";

describe("CacheRepository", () => {
  const db = {
    queryOne: vi.fn(),
    execute: vi.fn(),
    select: vi.fn(),
  };

  let repository: CacheRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new (CacheRepository as unknown as new (db: never) => CacheRepository)(
      db as never,
    );
    (CacheRepository as unknown as { instance: CacheRepository | null }).instance = null;
  });

  it("returns parsed cached data", async () => {
    db.queryOne.mockResolvedValue({ data: JSON.stringify({ hello: "world" }) });

    const result = await repository.get<{ hello: string }>("game-1", "igdb");

    expect(result).toEqual({ hello: "world" });
    expect(db.queryOne).toHaveBeenCalledWith(
      "SELECT data FROM enrichment_cache WHERE game_id = ? AND provider = ?",
      ["game-1", "igdb"],
    );
  });

  it("returns null for missing or invalid cache data", async () => {
    db.queryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ data: "{broken" });

    await expect(repository.get("game-1", "igdb")).resolves.toBeNull();
    await expect(repository.get("game-1", "igdb")).resolves.toBeNull();
  });

  it("writes cache entries", async () => {
    await repository.set("game-1", "igdb", { id: 123 });

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO enrichment_cache"),
      ["game-1", "igdb", JSON.stringify({ id: 123 })],
    );
  });

  it("returns valid cache entries only when not expired", async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    db.queryOne
      .mockResolvedValueOnce({
        data: JSON.stringify({ valid: true }),
        fetched_at: new Date(now - 1000).toISOString(),
      })
      .mockResolvedValueOnce({
        data: JSON.stringify({ expired: true }),
        fetched_at: new Date(now - 10_000).toISOString(),
      })
      .mockResolvedValueOnce({
        data: "{invalid",
        fetched_at: new Date(now - 1000).toISOString(),
      })
      .mockResolvedValueOnce({ data: null, fetched_at: null });

    await expect(repository.getIfValid("g1", "igdb", 5000)).resolves.toEqual({ valid: true });
    await expect(repository.getIfValid("g1", "igdb", 5000)).resolves.toBeNull();
    await expect(repository.getIfValid("g1", "igdb", 5000)).resolves.toBeNull();
    await expect(repository.getIfValid("g1", "igdb", 5000)).resolves.toBeNull();

    vi.useRealTimers();
  });

  it("clears cache by game, provider and globally", async () => {
    await repository.clearForGame("game-1");
    await repository.clearForProvider("igdb");
    await repository.clearAll();

    expect(db.execute).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM enrichment_cache WHERE game_id = ?",
      ["game-1"],
    );
    expect(db.execute).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM enrichment_cache WHERE provider = ?",
      ["igdb"],
    );
    expect(db.execute).toHaveBeenNthCalledWith(3, "DELETE FROM enrichment_cache");
  });

  it("returns cache stats", async () => {
    db.queryOne.mockResolvedValue({ count: 5 });
    db.select.mockResolvedValue([
      { provider: "igdb", count: 2 },
      { provider: "sgdb", count: 3 },
    ]);

    const stats = await repository.getStats();

    expect(stats).toEqual({
      totalEntries: 5,
      byProvider: {
        igdb: 2,
        sgdb: 3,
      },
    });
  });
});
