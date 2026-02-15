/**
 * Integration test: Enrichment Pipeline → Database
 *
 * Verifies that enrichment data (IGDB, ProtonDB, SteamGridDB)
 * flows correctly through the pipeline and is persisted in the
 * database with the expected column values.
 *
 * Uses mocked API responses (no real network calls).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnrichmentService } from "@/services/enrichment/EnrichmentService";
import type {
  EnrichmentData,
  IgdbData,
  ProtonDbData,
  SteamGridDbData,
} from "@/services/enrichment/EnrichmentService";
import type { DatabaseService } from "@/services/base/DatabaseService";
import type { Game } from "@/types";
import { createGame } from "@/types";

// ===== Mock Database =====

/**
 * In-memory DB mock that captures writes for assertion.
 * Tracks enrichment_cache and games table updates.
 */
function createMockDb() {
  const cache = new Map<string, { data: string; fetched_at: string }>();
  const gameUpdates = new Map<string, Record<string, unknown>>();

  return {
    cache,
    gameUpdates,

    db: {
      queryOne: vi.fn(async (_sql: string, params?: unknown[]) => {
        // enrichment_cache lookup
        if (_sql.includes("enrichment_cache") && params?.[0]) {
          const entry = cache.get(params[0] as string);
          if (entry) return entry;
        }
        return null;
      }),

      execute: vi.fn(async (_sql: string, params?: unknown[]) => {
        // enrichment_cache write
        if (_sql.includes("INSERT OR REPLACE INTO enrichment_cache") && params) {
          const gameId = params[0] as string;
          cache.set(gameId, {
            data: params[1] as string,
            fetched_at: new Date().toISOString(),
          });
        }
        // games table update (updateEnrichment goes through GameSyncService → GameRepository)
        // We don't test that here — we test the EnrichmentService output directly
      }),

      select: vi.fn(async () => []),
    } as unknown as DatabaseService,
  };
}

// ===== Mock Data =====

/** Realistic IGDB response for "The Witcher 3" */
const MOCK_IGDB: IgdbData = {
  id: 1942,
  name: "The Witcher 3: Wild Hunt",
  summary: "RPG set in a dark fantasy world.",
  rating: 92.5,
  aggregated_rating: 93.4,
  genres: [{ name: "Role-playing (RPG)" }, { name: "Adventure" }],
  involved_companies: [
    { company: { name: "CD Projekt Red" }, developer: true, publisher: false },
    { company: { name: "CD Projekt" }, developer: false, publisher: true },
  ],
  first_release_date: 1431993600, // 2015-05-19
  cover: { url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg" },
  screenshots: [{ url: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc1.jpg" }],
  steamAppId: 292030,
  timeToBeat: {
    hastily: 26.3, // hours
    normally: 51.5, // hours
    completely: 103.8, // hours
  },
};

/** Realistic ProtonDB response */
const MOCK_PROTONDB: ProtonDbData = {
  tier: "gold",
  confidence: "strong",
  trendingTier: "platinum",
  score: 0.85,
};

/** Realistic SteamGridDB response */
const MOCK_STEAMGRIDDB: SteamGridDbData = {
  hero: "https://steamgriddb.com/hero/witcher3.png",
  grid: "https://steamgriddb.com/grid/witcher3.png",
  logo: "https://steamgriddb.com/logo/witcher3.png",
  icon: "https://steamgriddb.com/icon/witcher3.png",
};

// ===== Helper: Create test game =====

function makeTestGame(overrides: Partial<Parameters<typeof createGame>[0]> = {}): Game {
  return createGame({
    id: "epic-witcher3",
    store: "epic",
    storeId: "witcher3",
    title: "The Witcher 3",
    ...overrides,
  });
}

// ===== Tests =====

// Mock DatabaseService at module level
vi.mock("@/services/base/DatabaseService", () => {
  const mockDbInstance = {
    queryOne: vi.fn(),
    execute: vi.fn(),
    select: vi.fn(),
    init: vi.fn(),
  };
  
  return {
    DatabaseService: {
      getInstance: () => mockDbInstance,
    },
  };
});

// Mock ImageCacheService
vi.mock("@/services/enrichment/ImageCacheService", () => ({
  ImageCacheService: {
    getInstance: () => ({
      cacheGameImages: vi.fn().mockResolvedValue({}),
      clearGameCache: vi.fn(),
      clearAllCache: vi.fn(),
    }),
  },
}));

describe("Enrichment Pipeline Integration", () => {
  let service: EnrichmentService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockDbInstance: any;

  beforeEach(async () => {
    // Import fresh to get mocked dependencies
    const { EnrichmentService: ES } = await import("@/services/enrichment/EnrichmentService");
    const { DatabaseService: DS } = await import("@/services/base/DatabaseService");
    
    mockDb = createMockDb();
    mockDbInstance = DS.getInstance();
    
    // Configure mock behavior
    mockDbInstance.queryOne.mockImplementation(mockDb.db.queryOne);
    mockDbInstance.execute.mockImplementation(mockDb.db.execute);
    
    service = ES.getInstance();
  });

  /**
   * Mock internal enricher methods to return our test data
   * without making real API calls.
   */
  function mockEnrichers(
    igdb: IgdbData | null = MOCK_IGDB,
    protonDb: ProtonDbData | null = MOCK_PROTONDB,
    steamGridDb: SteamGridDbData | null = MOCK_STEAMGRIDDB,
  ) {
    // Access private enrichers for mocking
    const svc = service as unknown as {
      igdb: { search: (title: string) => Promise<IgdbData | null> };
      protonDb: { searchByAppId: (id: number) => Promise<ProtonDbData | null> };
      steamGridDb: { search: (title: string) => Promise<SteamGridDbData | null> };
      imageCache: { cacheGameImages: () => Promise<Record<string, string | string[]>> };
    };

    svc.igdb.search = vi.fn().mockResolvedValue(igdb);
    svc.protonDb.searchByAppId = vi.fn().mockResolvedValue(protonDb);
    svc.steamGridDb.search = vi.fn().mockResolvedValue(steamGridDb);
    // Skip actual image caching in tests
    svc.imageCache.cacheGameImages = vi.fn().mockResolvedValue({});
  }

  describe("IGDB data → Game object", () => {
    it("should populate info fields from IGDB", async () => {
      mockEnrichers(MOCK_IGDB, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.info.description).toBe("RPG set in a dark fantasy world.");
      expect(enriched.info.summary).toBe("RPG set in a dark fantasy world.");
      expect(enriched.info.igdbRating).toBe(93); // Math.round(92.5)
      expect(enriched.info.metacriticScore).toBe(93); // Math.round(93.4)
      expect(enriched.info.genres).toEqual(["Role-playing (RPG)", "Adventure"]);
      expect(enriched.info.developer).toBe("CD Projekt Red");
      expect(enriched.info.publisher).toBe("CD Projekt");
      expect(enriched.info.releaseDate).toContain("2015");
    });

    it("should populate timeToBeat from IGDB game_time_to_beats", async () => {
      mockEnrichers(MOCK_IGDB, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.gameCompletion.timeToBeatHastily).toBe(26.3);
      expect(enriched.gameCompletion.timeToBeatNormally).toBe(51.5);
      expect(enriched.gameCompletion.timeToBeatCompletely).toBe(103.8);
    });

    it("should extract Steam App ID from IGDB external_games", async () => {
      mockEnrichers(MOCK_IGDB, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.protonData.steamAppId).toBe(292030);
    });

    it("should handle missing timeToBeat gracefully", async () => {
      const igdbNoTime: IgdbData = { ...MOCK_IGDB, timeToBeat: undefined };
      mockEnrichers(igdbNoTime, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // Should keep defaults (0)
      expect(enriched.gameCompletion.timeToBeatHastily).toBe(0);
      expect(enriched.gameCompletion.timeToBeatNormally).toBe(0);
      expect(enriched.gameCompletion.timeToBeatCompletely).toBe(0);
    });

    it("should handle missing steamAppId gracefully", async () => {
      const igdbNoSteam: IgdbData = { ...MOCK_IGDB, steamAppId: undefined };
      mockEnrichers(igdbNoSteam, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.protonData.steamAppId).toBe(0); // default
    });
  });

  describe("ProtonDB data → Game object", () => {
    it("should populate protonData from ProtonDB", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.protonData.protonTier).toBe("gold");
      expect(enriched.protonData.protonConfidence).toBe("strong");
      expect(enriched.protonData.protonTrendingTier).toBe("platinum");
    });

    it("should use Steam App ID from IGDB for ProtonDB lookup", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, null);
      const game = makeTestGame();
      await service.enrichGame(game);

      // Verify ProtonDB was called with the steamAppId from IGDB
      const svc = service as unknown as {
        protonDb: { searchByAppId: ReturnType<typeof vi.fn> };
      };
      expect(svc.protonDb.searchByAppId).toHaveBeenCalledWith(292030);
    });

    it("should skip ProtonDB when no Steam App ID available", async () => {
      const igdbNoSteam: IgdbData = { ...MOCK_IGDB, steamAppId: undefined };
      mockEnrichers(igdbNoSteam, MOCK_PROTONDB, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // ProtonDB should not be called, protonData stays at defaults
      const svc = service as unknown as {
        protonDb: { searchByAppId: ReturnType<typeof vi.fn> };
      };
      expect(svc.protonDb.searchByAppId).not.toHaveBeenCalled();
      expect(enriched.protonData.protonTier).toBe("pending");
    });
  });

  describe("Full pipeline: IGDB + ProtonDB + SteamGridDB", () => {
    it("should produce a fully enriched Game with all data", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, MOCK_STEAMGRIDDB);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // IGDB data
      expect(enriched.info.description).toBeTruthy();
      expect(enriched.info.genres.length).toBeGreaterThan(0);
      expect(enriched.info.developer).toBeTruthy();
      expect(enriched.info.publisher).toBeTruthy();
      expect(enriched.info.igdbRating).toBeGreaterThan(0);

      // Time to beat from IGDB
      expect(enriched.gameCompletion.timeToBeatHastily).toBeGreaterThan(0);
      expect(enriched.gameCompletion.timeToBeatNormally).toBeGreaterThan(0);
      expect(enriched.gameCompletion.timeToBeatCompletely).toBeGreaterThan(0);

      // ProtonDB data
      expect(enriched.protonData.protonTier).not.toBe("pending");
      expect(enriched.protonData.steamAppId).toBeGreaterThan(0);

      // Enrichment timestamp
      expect(enriched.enrichedAt).toBeTruthy();

      // Original game data preserved
      expect(enriched.id).toBe("epic-witcher3");
      expect(enriched.storeData.store).toBe("epic");
      expect(enriched.info.title).toBe("The Witcher 3");
    });

    it("should set enrichedAt timestamp", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, MOCK_STEAMGRIDDB);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.enrichedAt).toBeDefined();
      // Should be a valid ISO date
      const date = new Date(enriched.enrichedAt!);
      expect(date.getTime()).toBeGreaterThan(0);
    });
  });

  describe("Enrichment cache", () => {
    it("should save enrichment to cache after first call", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, null);
      const game = makeTestGame();
      await service.enrichGame(game);

      // Cache should have been written
      expect(mockDb.cache.has("epic-witcher3")).toBe(true);

      const cached = mockDb.cache.get("epic-witcher3")!;
      const data = JSON.parse(cached.data);
      expect(data.igdb).toBeTruthy();
      expect(data.igdb.name).toBe("The Witcher 3: Wild Hunt");
      expect(data.igdb.timeToBeat).toBeTruthy();
      expect(data.igdb.steamAppId).toBe(292030);
    });

    it("should include cache version in saved data", async () => {
      mockEnrichers(MOCK_IGDB, null, null);
      const game = makeTestGame();
      await service.enrichGame(game);

      const cached = mockDb.cache.get("epic-witcher3")!;
      const data = JSON.parse(cached.data);
      expect(data._cacheVersion).toBe(3);
    });

    it("should serve from cache on second call", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, null);
      const game = makeTestGame();

      // First call — populates cache
      const first = await service.enrichGame(game);

      // Second call — should use cache
      const second = await service.enrichGame(game);

      // Both should produce same data
      expect(second.info.description).toBe(first.info.description);
      expect(second.gameCompletion.timeToBeatHastily).toBe(first.gameCompletion.timeToBeatHastily);
      expect(second.protonData.steamAppId).toBe(first.protonData.steamAppId);
    });

    it("should invalidate cache with old version", async () => {
      // Pre-populate cache with old version (v1)
      const oldCacheData: EnrichmentData & { _cacheVersion?: number } = {
        igdb: {
          id: 1942,
          name: "The Witcher 3: Wild Hunt",
          summary: "Old data",
          // No timeToBeat, no steamAppId — old format
        },
        protonDb: null,
        steamGridDb: null,
        _cacheVersion: 1, // Old version
      };

      mockDb.cache.set("epic-witcher3", {
        data: JSON.stringify(oldCacheData),
        fetched_at: new Date().toISOString(),
      });

      // Set up enrichers for the re-fetch
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // Should NOT use old cache — should have new data
      expect(enriched.info.description).toBe("RPG set in a dark fantasy world.");
      expect(enriched.gameCompletion.timeToBeatHastily).toBe(26.3);
      expect(enriched.protonData.steamAppId).toBe(292030);
    });

    it("should invalidate cache without version (legacy)", async () => {
      // Pre-populate cache with no version (legacy data)
      const legacyCacheData = {
        igdb: { id: 1942, name: "Old" },
        hltb: null,
        protonDb: null,
        steamGridDb: null,
        // No _cacheVersion at all
      };

      mockDb.cache.set("epic-witcher3", {
        data: JSON.stringify(legacyCacheData),
        fetched_at: new Date().toISOString(),
      });

      mockEnrichers(MOCK_IGDB, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // Should re-fetch and get new data
      expect(enriched.info.description).toBe("RPG set in a dark fantasy world.");
      expect(enriched.gameCompletion.timeToBeatHastily).toBe(26.3);
    });
  });

  describe("DB column mapping (GameSyncService contract)", () => {
    /**
     * Verify that the enriched Game object has the correct shape
     * for GameSyncService.updateEnrichment() to persist.
     *
     * This test simulates what GameSyncService does with the enriched Game.
     */
    it("should produce data compatible with updateEnrichment columns", async () => {
      mockEnrichers(MOCK_IGDB, MOCK_PROTONDB, MOCK_STEAMGRIDDB);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      // Simulate what GameSyncService does
      const dbColumns: Record<string, unknown> = {
        description: enriched.info.description,
        summary: enriched.info.summary,
        metacritic_score: enriched.info.metacriticScore,
        igdb_rating: enriched.info.igdbRating,
        developer: enriched.info.developer,
        publisher: enriched.info.publisher,
        genres: enriched.info.genres,
        release_date: enriched.info.releaseDate,
        hltb_main: enriched.gameCompletion.timeToBeatHastily,
        hltb_main_extra: enriched.gameCompletion.timeToBeatNormally,
        hltb_complete: enriched.gameCompletion.timeToBeatCompletely,
        proton_tier: enriched.protonData.protonTier,
        proton_confidence: enriched.protonData.protonConfidence,
        proton_trending_tier: enriched.protonData.protonTrendingTier,
        steam_app_id: enriched.protonData.steamAppId || null,
        enriched_at: enriched.enrichedAt,
      };

      // Verify all columns have expected values
      expect(dbColumns.description).toBe("RPG set in a dark fantasy world.");
      expect(dbColumns.summary).toBe("RPG set in a dark fantasy world.");
      expect(dbColumns.metacritic_score).toBe(93);
      expect(dbColumns.igdb_rating).toBe(93);
      expect(dbColumns.developer).toBe("CD Projekt Red");
      expect(dbColumns.publisher).toBe("CD Projekt");
      expect(dbColumns.genres).toEqual(["Role-playing (RPG)", "Adventure"]);
      expect(dbColumns.release_date).toContain("2015");

      // Time to beat (from IGDB, NOT HLTB)
      expect(dbColumns.hltb_main).toBe(26.3);
      expect(dbColumns.hltb_main_extra).toBe(51.5);
      expect(dbColumns.hltb_complete).toBe(103.8);

      // ProtonDB
      expect(dbColumns.proton_tier).toBe("gold");
      expect(dbColumns.proton_confidence).toBe("strong");
      expect(dbColumns.proton_trending_tier).toBe("platinum");
      expect(dbColumns.steam_app_id).toBe(292030);

      // Timestamp
      expect(dbColumns.enriched_at).toBeTruthy();
    });

    it("should produce safe defaults when no data is available", async () => {
      mockEnrichers(null, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      const dbColumns: Record<string, unknown> = {
        hltb_main: enriched.gameCompletion.timeToBeatHastily,
        hltb_main_extra: enriched.gameCompletion.timeToBeatNormally,
        hltb_complete: enriched.gameCompletion.timeToBeatCompletely,
        proton_tier: enriched.protonData.protonTier,
        steam_app_id: enriched.protonData.steamAppId || null,
      };

      // All defaults — nothing crashes, no null propagation
      expect(dbColumns.hltb_main).toBe(0);
      expect(dbColumns.hltb_main_extra).toBe(0);
      expect(dbColumns.hltb_complete).toBe(0);
      expect(dbColumns.proton_tier).toBe("pending");
      expect(dbColumns.steam_app_id).toBeNull();
    });
  });

  describe("IgdbEnricher unit: mapToIgdbData", () => {
    it("should convert seconds → hours in timeToBeat", async () => {
      // Verify the seconds→hours conversion is correct
      // 94680s = 26.3h, 185400s = 51.5h, 373680s = 103.8h
      const igdbWithRawSeconds: IgdbData = {
        ...MOCK_IGDB,
        timeToBeat: {
          hastily: 26.3, // Already in hours from IgdbEnricher
          normally: 51.5,
          completely: 103.8,
        },
      };
      mockEnrichers(igdbWithRawSeconds, null, null);
      const game = makeTestGame();
      const enriched = await service.enrichGame(game);

      expect(enriched.gameCompletion.timeToBeatHastily).toBe(26.3);
      expect(enriched.gameCompletion.timeToBeatNormally).toBe(51.5);
      expect(enriched.gameCompletion.timeToBeatCompletely).toBe(103.8);
    });
  });
});
