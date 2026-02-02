/**
 * GameStoreService tests
 * Tests for the abstract base class of store services
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameStoreService } from "@/services/stores/GameStoreService";
import type { SidecarService } from "@/services/base/SidecarService";
import type { DatabaseService } from "@/services/base/DatabaseService";
import type { Game } from "@/types";

// Concrete implementation for testing
class TestStoreService extends GameStoreService {
  get storeName(): Game["store"] {
    return "epic";
  }

  async listGames(): Promise<Game[]> {
    return [];
  }

  // Expose protected methods for testing
  async testSaveGames(games: Game[]): Promise<void> {
    return this.saveGames(games);
  }

  testRowToGame(row: Record<string, unknown>): Game {
    return this.rowToGame(row);
  }
}

// Mock sidecar service
const createMockSidecar = () =>
  ({
    runLegendary: vi.fn(),
    runGogdl: vi.fn(),
    runNile: vi.fn(),
    runSteam: vi.fn(),
    isAvailable: vi.fn(),
  }) as unknown as SidecarService;

// Mock database service
const createMockDb = () =>
  ({
    execute: vi.fn(),
    select: vi.fn(),
    queryOne: vi.fn(),
  }) as unknown as DatabaseService;

describe("GameStoreService", () => {
  let service: TestStoreService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new TestStoreService(
      mockSidecar as unknown as SidecarService,
      mockDb as unknown as DatabaseService,
    );
  });

  describe("storeName", () => {
    it("should return the store name from subclass", () => {
      expect(service.storeName).toBe("epic");
    });
  });

  describe("saveGames / persistGames", () => {
    it("should save games to database", async () => {
      const now = new Date().toISOString();
      const games: Game[] = [
        {
          id: "epic-TestGame",
          storeId: "TestGame",
          store: "epic",
          title: "Test Game",
          installed: true,
          installPath: "/path/to/game",
          installSize: "10.0 GB",
          executablePath: "/path/to/game/game.exe",
          genres: ["Action", "RPG"],
          playTimeMinutes: 120,
          createdAt: now,
          updatedAt: now,
        },
      ];

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      await service.persistGames(games);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO games"),
        expect.arrayContaining([
          "epic-TestGame",
          "TestGame",
          "epic",
          "Test Game",
          1, // installed as integer
          "/path/to/game",
          "10.0 GB",
          "/path/to/game/game.exe",
          '["Action","RPG"]', // genres as JSON
          120,
          now,
          now,
        ]),
      );
    });

    it("should save multiple games", async () => {
      const now = new Date().toISOString();
      const games: Game[] = [
        {
          id: "epic-Game1",
          storeId: "Game1",
          store: "epic",
          title: "Game 1",
          installed: true,
          genres: [],
          playTimeMinutes: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "epic-Game2",
          storeId: "Game2",
          store: "epic",
          title: "Game 2",
          installed: false,
          genres: [],
          playTimeMinutes: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      await service.persistGames(games);

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it("should handle empty game list", async () => {
      await service.persistGames([]);

      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe("getStoredGames", () => {
    it("should retrieve games from database", async () => {
      const mockRows = [
        {
          id: "epic-TestGame",
          store_id: "TestGame",
          store: "epic",
          title: "Test Game",
          installed: 1,
          install_path: "/path/to/game",
          install_size: "10.0 GB",
          genres: '["Action"]',
          play_time_minutes: 60,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ];

      vi.mocked(mockDb.select).mockResolvedValue(mockRows);

      const games = await service.getStoredGames();

      expect(mockDb.select).toHaveBeenCalledWith("SELECT * FROM games WHERE store = ?", ["epic"]);
      expect(games).toHaveLength(1);
      expect(games[0].id).toBe("epic-TestGame");
      expect(games[0].installed).toBe(true);
    });

    it("should return empty array when no games stored", async () => {
      vi.mocked(mockDb.select).mockResolvedValue([]);

      const games = await service.getStoredGames();

      expect(games).toEqual([]);
    });
  });

  describe("rowToGame", () => {
    it("should convert database row to Game object", () => {
      const row = {
        id: "epic-TestGame",
        store_id: "TestGame",
        store: "epic",
        title: "Test Game",
        installed: 1,
        install_path: "/path/to/game",
        install_size: "10.0 GB",
        executable_path: "/path/to/game/game.exe",
        custom_executable: null,
        wine_prefix: null,
        wine_version: null,
        runner: "wine",
        description: "A test game",
        summary: "Test summary",
        metacritic_score: 85,
        igdb_rating: 90,
        genres: '["Action","RPG"]',
        play_time_minutes: 120,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };

      const game = service.testRowToGame(row);

      expect(game.id).toBe("epic-TestGame");
      expect(game.storeId).toBe("TestGame");
      expect(game.store).toBe("epic");
      expect(game.title).toBe("Test Game");
      expect(game.installed).toBe(true);
      expect(game.installPath).toBe("/path/to/game");
      expect(game.installSize).toBe("10.0 GB");
      expect(game.executablePath).toBe("/path/to/game/game.exe");
      expect(game.runner).toBe("wine");
      expect(game.description).toBe("A test game");
      expect(game.metacriticScore).toBe(85);
      expect(game.igdbRating).toBe(90);
    });

    it("should handle null/undefined values", () => {
      const row = {
        id: "epic-MinimalGame",
        store_id: "MinimalGame",
        store: "epic",
        title: "Minimal Game",
        installed: 0,
        install_path: null,
        install_size: null,
        executable_path: null,
        custom_executable: undefined,
        wine_prefix: undefined,
        wine_version: undefined,
        runner: undefined,
        description: undefined,
        summary: undefined,
        metacritic_score: undefined,
        igdb_rating: undefined,
      };

      const game = service.testRowToGame(row);

      expect(game.installed).toBe(false);
      // Note: rowToGame uses direct cast, so null from DB remains null
      expect(game.installPath).toBeFalsy();
      expect(game.installSize).toBeFalsy();
      expect(game.executablePath).toBeFalsy();
      expect(game.runner).toBeFalsy();
    });
  });
});
