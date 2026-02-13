import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGame } from "../../helpers/mocks";
import type { Game } from "@/types";

// Mock Tauri event system
const mockEmit = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

// Mock GameRepository
const mockGetAllGames = vi.fn();
const mockUpsertGames = vi.fn();
const mockUpdateEnrichment = vi.fn();

vi.mock("@/lib/database", () => ({
  GameRepository: {
    getInstance: vi.fn(() => ({
      getAllGames: mockGetAllGames,
      upsertGames: mockUpsertGames,
      updateEnrichment: mockUpdateEnrichment,
    })),
  },
}));

// Mock store services
const mockLegendaryIsAuth = vi.fn();
const mockLegendaryListGames = vi.fn();
const mockGogdlIsAuth = vi.fn();
const mockGogdlListGames = vi.fn();
const mockNileIsAuth = vi.fn();
const mockNileListGames = vi.fn();
const mockSteamListGames = vi.fn();

vi.mock("@/services/stores", () => ({
  LegendaryService: {
    getInstance: vi.fn(() => ({
      isAuthenticated: mockLegendaryIsAuth,
      listGames: mockLegendaryListGames,
    })),
  },
  GogdlService: {
    getInstance: vi.fn(() => ({
      isAuthenticated: mockGogdlIsAuth,
      listGames: mockGogdlListGames,
    })),
  },
  NileService: {
    getInstance: vi.fn(() => ({
      isAuthenticated: mockNileIsAuth,
      listGames: mockNileListGames,
    })),
  },
  SteamService: {
    getInstance: vi.fn(() => ({
      listGames: mockSteamListGames,
    })),
  },
}));

// Mock EnrichmentService
const mockConfigureApis = vi.fn();
const mockInvalidateOutdatedCache = vi.fn();
const mockEnrichGame = vi.fn();

vi.mock("@/services/enrichment", () => ({
  EnrichmentService: {
    getInstance: vi.fn(() => ({
      configureApis: mockConfigureApis,
      invalidateOutdatedCache: mockInvalidateOutdatedCache,
      enrichGame: mockEnrichGame,
    })),
  },
}));

// Mock HeroicImportService
const mockGetInstalledGames = vi.fn();
const mockMergeInstallations = vi.fn();

vi.mock("@/services/heroic", () => ({
  HeroicImportService: {
    getInstance: vi.fn(() => ({
      getInstalledGames: mockGetInstalledGames,
      mergeInstallations: mockMergeInstallations,
    })),
  },
}));

// Mock API keys service
const mockGetApiKeys = vi.fn();
const mockGetIGDBAccessToken = vi.fn();

vi.mock("@/services/api/apiKeys", () => ({
  getApiKeys: () => mockGetApiKeys(),
  getIGDBAccessToken: () => mockGetIGDBAccessToken(),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("GameSyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllGames.mockResolvedValue([]);
    mockUpsertGames.mockResolvedValue(undefined);
    mockGetInstalledGames.mockResolvedValue([]);
    mockMergeInstallations.mockResolvedValue(0);
    mockInvalidateOutdatedCache.mockResolvedValue(0);
    mockGetApiKeys.mockResolvedValue({
      hasIgdb: false,
      hasSteamgriddb: false,
    });
    mockGetIGDBAccessToken.mockResolvedValue(null);
  });

  describe("Singleton pattern", () => {
    it("returns the same instance", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const instance1 = GameSyncService.getInstance();
      const instance2 = GameSyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("sync", () => {
    it("syncs all stores by default", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      // All stores not authenticated
      mockLegendaryIsAuth.mockResolvedValue(false);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      const result = await service.sync();

      expect(result).toMatchObject({
        total: 0,
        added: 0,
        updated: 0,
        enriched: 0,
      });
      expect(mockLegendaryIsAuth).toHaveBeenCalled();
      expect(mockGogdlIsAuth).toHaveBeenCalled();
      expect(mockNileIsAuth).toHaveBeenCalled();
      expect(mockSteamListGames).toHaveBeenCalled();
    });

    it("syncs only specified stores", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      mockLegendaryIsAuth.mockResolvedValue(false);

      await service.sync({ stores: ["epic"] });

      expect(mockLegendaryIsAuth).toHaveBeenCalled();
      expect(mockGogdlIsAuth).not.toHaveBeenCalled();
      expect(mockNileIsAuth).not.toHaveBeenCalled();
    });

    it("fetches and persists games from authenticated store", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const epicGames = [
        createMockGame("epic-game1", {
          info: { title: "Test Epic Game" },
          storeData: { store: "epic", storeId: "game1" },
        }),
      ] as unknown as Game[];

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue(epicGames);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      const result = await service.sync({ skipEnrichment: true });

      expect(mockUpsertGames).toHaveBeenCalledWith(epicGames);
      expect(result.total).toBe(1);
      expect(result.added).toBe(1);
    });

    it("distinguishes between added and updated games", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const existingGame = createMockGame("epic-existing", {
        info: { title: "Existing" },
      }) as unknown as Game;
      const newGame = createMockGame("epic-new", { info: { title: "New" } }) as unknown as Game;

      mockGetAllGames.mockResolvedValue([existingGame]);
      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([existingGame, newGame]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      const result = await service.sync({ skipEnrichment: true });

      expect(result.added).toBe(1);
      expect(result.updated).toBe(1);
    });

    it("emits progress events", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      mockLegendaryIsAuth.mockResolvedValue(false);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      await service.sync();

      expect(mockEmit).toHaveBeenCalledWith(
        "splash-progress",
        expect.objectContaining({
          phase: "complete",
        }),
      );
    });

    it("merges Heroic installations", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      mockLegendaryIsAuth.mockResolvedValue(false);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockGetInstalledGames.mockResolvedValue([
        {
          gameId: "gog-123",
          store: "gog",
          installPath: "/games/test",
        },
      ]);
      mockMergeInstallations.mockResolvedValue(1);

      const result = await service.sync({ skipEnrichment: true });

      expect(mockGetInstalledGames).toHaveBeenCalled();
      expect(mockMergeInstallations).toHaveBeenCalled();
      expect(result.updated).toBe(1);
    });
  });

  describe("enrichment", () => {
    it("skips enrichment when skipEnrichment is true", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([
        createMockGame("epic-1", { info: { title: "Game" } }),
      ] as unknown as Game[]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      const result = await service.sync({ skipEnrichment: true });

      expect(mockEnrichGame).not.toHaveBeenCalled();
      expect(result.enriched).toBe(0);
    });

    it("enriches only unenriched games", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const unenrichedGame = createMockGame("epic-1", {
        info: { title: "Unenriched" },
        enrichedAt: null,
      }) as unknown as Game;

      const enrichedGame = createMockGame("epic-2", {
        info: { title: "Enriched" },
        enrichedAt: new Date().toISOString(),
      }) as unknown as Game;

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([unenrichedGame, enrichedGame]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockEnrichGame.mockResolvedValue(unenrichedGame);

      mockGetApiKeys.mockResolvedValue({
        hasIgdb: true,
        igdbClientId: "test",
        hasSteamgriddb: false,
      });
      mockGetIGDBAccessToken.mockResolvedValue("token");

      const result = await service.sync();

      expect(mockEnrichGame).toHaveBeenCalledTimes(1);
      expect(mockEnrichGame).toHaveBeenCalledWith(unenrichedGame);
      expect(result.enriched).toBe(1);
    });

    it("force enriches all games when forceEnrich is true", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const enrichedGame = createMockGame("epic-1", {
        info: { title: "Already enriched" },
        enrichedAt: new Date().toISOString(),
      }) as unknown as Game;

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([enrichedGame]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockEnrichGame.mockResolvedValue(enrichedGame);

      mockGetApiKeys.mockResolvedValue({
        hasIgdb: true,
        igdbClientId: "test",
        hasSteamgriddb: false,
      });
      mockGetIGDBAccessToken.mockResolvedValue("token");

      const result = await service.sync({ forceEnrich: true });

      expect(mockEnrichGame).toHaveBeenCalledTimes(1);
      expect(result.enriched).toBe(1);
    });

    it("configures enrichment APIs with keys", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const game = createMockGame("epic-1", {
        enrichedAt: null,
      }) as unknown as Game;

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([game]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockGetApiKeys.mockResolvedValue({
        hasIgdb: true,
        igdbClientId: "client-123",
        hasSteamgriddb: true,
        steamgriddbApiKey: "sgdb-456",
      });
      mockGetIGDBAccessToken.mockResolvedValue("token-789");

      mockEnrichGame.mockResolvedValue(game);

      await service.sync();

      expect(mockConfigureApis).toHaveBeenCalledWith({
        igdb: {
          clientId: "client-123",
          accessToken: "token-789",
        },
        steamGridDb: {
          apiKey: "sgdb-456",
        },
      });
    });

    it("handles enrichment errors gracefully", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const game1 = createMockGame("epic-1", {
        info: { title: "Game 1" },
        enrichedAt: null,
      }) as unknown as Game;
      const game2 = createMockGame("epic-2", {
        info: { title: "Game 2" },
        enrichedAt: null,
      }) as unknown as Game;

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([game1, game2]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockGetApiKeys.mockResolvedValue({
        hasIgdb: true,
        igdbClientId: "test",
      });
      mockGetIGDBAccessToken.mockResolvedValue("token");

      mockEnrichGame
        .mockRejectedValueOnce(new Error("IGDB API error"))
        .mockResolvedValueOnce(game2);

      const result = await service.sync();

      expect(result.enriched).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        gameTitle: "Game 1",
        phase: "enrich",
      });
    });

    it("invalidates outdated cache and re-enriches", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      const game = createMockGame("epic-1", {
        info: { title: "Game" },
        enrichedAt: null,
      }) as unknown as Game;

      mockLegendaryIsAuth.mockResolvedValue(true);
      mockLegendaryListGames.mockResolvedValue([game]);
      mockGogdlIsAuth.mockResolvedValue(false);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      mockInvalidateOutdatedCache.mockResolvedValue(1); // 1 entry invalidated
      mockGetAllGames.mockResolvedValue([game]); // Re-read from DB

      mockGetApiKeys.mockResolvedValue({
        hasIgdb: true,
        igdbClientId: "test",
      });
      mockGetIGDBAccessToken.mockResolvedValue("token");
      mockEnrichGame.mockResolvedValue(game);

      await service.sync();

      expect(mockInvalidateOutdatedCache).toHaveBeenCalled();
      expect(mockGetAllGames).toHaveBeenCalledTimes(2); // Initial + after invalidation
    });
  });

  describe("error handling", () => {
    it("continues sync after store fetch error", async () => {
      const { GameSyncService } = await import("@/lib/sync/GameSyncService");
      const service = GameSyncService.getInstance();

      mockLegendaryIsAuth.mockRejectedValue(new Error("Network error"));
      mockGogdlIsAuth.mockResolvedValue(true);
      mockGogdlListGames.mockResolvedValue([
        createMockGame("gog-1", { info: { title: "GOG Game" } }),
      ] as unknown as Game[]);
      mockNileIsAuth.mockResolvedValue(false);
      mockSteamListGames.mockResolvedValue([]);

      const result = await service.sync({ skipEnrichment: true });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        store: "epic",
        phase: "fetch",
      });
    });
  });
});
