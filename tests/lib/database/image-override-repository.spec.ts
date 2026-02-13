import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageOverrideRepository } from "@/lib/database/ImageOverrideRepository";
import type { OverridableAssetType } from "@/lib/database/ImageOverrideRepository";

describe("ImageOverrideRepository", () => {
  const db = {
    queryOne: vi.fn(),
    execute: vi.fn(),
    select: vi.fn(),
  };

  let repo: ImageOverrideRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new (ImageOverrideRepository as unknown as new (db: never) => ImageOverrideRepository)(
      db as never,
    );
    (ImageOverrideRepository as unknown as { instance: ImageOverrideRepository | null }).instance =
      null;
  });

  // ===== Read Operations =====

  describe("getOverrides", () => {
    it("returns all overrides for a game", async () => {
      db.select.mockResolvedValue([
        {
          game_id: "game-1",
          asset_type: "hero",
          path: "/cache/hero_override.jpg",
          created_at: "2025-01-01",
        },
        {
          game_id: "game-1",
          asset_type: "grid",
          path: "/cache/grid_override.png",
          created_at: "2025-01-01",
        },
      ]);

      const result = await repo.getOverrides("game-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        gameId: "game-1",
        assetType: "hero",
        path: "/cache/hero_override.jpg",
        createdAt: "2025-01-01",
      });
      expect(result[1].assetType).toBe("grid");
      expect(db.select).toHaveBeenCalledWith(
        expect.stringContaining("FROM image_overrides WHERE game_id = ?"),
        ["game-1"],
      );
    });

    it("returns empty array when no overrides exist", async () => {
      db.select.mockResolvedValue([]);
      const result = await repo.getOverrides("no-overrides");
      expect(result).toEqual([]);
    });
  });

  describe("getOverridesBatch", () => {
    it("returns a map of overrides keyed by game ID", async () => {
      db.select.mockResolvedValue([
        { game_id: "game-1", asset_type: "hero", path: "/a.jpg", created_at: "2025-01-01" },
        { game_id: "game-2", asset_type: "logo", path: "/b.png", created_at: "2025-01-01" },
        { game_id: "game-1", asset_type: "grid", path: "/c.jpg", created_at: "2025-01-02" },
      ]);

      const result = await repo.getOverridesBatch(["game-1", "game-2"]);

      expect(result.get("game-1")).toHaveLength(2);
      expect(result.get("game-2")).toHaveLength(1);
      expect(result.get("game-2")![0].assetType).toBe("logo");
    });

    it("returns empty map for empty input", async () => {
      const result = await repo.getOverridesBatch([]);
      expect(result.size).toBe(0);
      expect(db.select).not.toHaveBeenCalled();
    });

    it("uses correct IN clause with placeholders", async () => {
      db.select.mockResolvedValue([]);

      await repo.getOverridesBatch(["a", "b", "c"]);

      expect(db.select).toHaveBeenCalledWith(expect.stringContaining("WHERE game_id IN (?,?,?)"), [
        "a",
        "b",
        "c",
      ]);
    });
  });

  describe("getLockedAssetTypes", () => {
    it("returns a set of overridden asset types", async () => {
      db.select.mockResolvedValue([{ asset_type: "hero" }, { asset_type: "logo" }]);

      const result = await repo.getLockedAssetTypes("game-1");

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has("hero")).toBe(true);
      expect(result.has("logo")).toBe(true);
      expect(result.has("grid")).toBe(false);
    });

    it("returns empty set when no overrides", async () => {
      db.select.mockResolvedValue([]);
      const result = await repo.getLockedAssetTypes("game-1");
      expect(result.size).toBe(0);
    });
  });

  // ===== Write Operations =====

  describe("setOverride", () => {
    it("inserts or replaces an override", async () => {
      await repo.setOverride("game-1", "hero", "/cache/hero_override.jpg");

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO image_overrides"),
        ["game-1", "hero", "/cache/hero_override.jpg"],
      );
    });

    it("works with all overridable asset types", async () => {
      const types: OverridableAssetType[] = [
        "hero",
        "grid",
        "horizontal_grid",
        "logo",
        "icon",
        "cover",
      ];

      for (const type of types) {
        await repo.setOverride("game-1", type, `/cache/${type}_override.jpg`);
      }

      expect(db.execute).toHaveBeenCalledTimes(types.length);
    });
  });

  describe("removeOverride", () => {
    it("deletes a single override", async () => {
      await repo.removeOverride("game-1", "hero");

      expect(db.execute).toHaveBeenCalledWith(
        "DELETE FROM image_overrides WHERE game_id = ? AND asset_type = ?",
        ["game-1", "hero"],
      );
    });
  });

  describe("removeAllOverrides", () => {
    it("deletes all overrides for a game", async () => {
      await repo.removeAllOverrides("game-1");

      expect(db.execute).toHaveBeenCalledWith("DELETE FROM image_overrides WHERE game_id = ?", [
        "game-1",
      ]);
    });
  });
});
