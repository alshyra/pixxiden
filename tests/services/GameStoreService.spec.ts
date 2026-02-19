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
  get storeName(): Game["storeData"]["store"] {
    return "epic";
  }

  async listGames(): Promise<Game[]> {
    return [];
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
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
      expect(game.storeData.storeId).toBe("TestGame");
      expect(game.storeData.store).toBe("epic");
      expect(game.info.title).toBe("Test Game");
      expect(game.installation.installed).toBe(true);
      expect(game.installation.installPath).toBe("/path/to/game");
      expect(game.installation.installSize).toBe("10.0 GB");
      expect(game.installation.executablePath).toBe("/path/to/game/game.exe");
      expect(game.installation.runner).toBe("wine");
      expect(game.info.description).toBe("A test game");
      expect(game.info.metacriticScore).toBe(85);
      expect(game.info.igdbRating).toBe(90);
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

      expect(game.installation.installed).toBe(false);
      // Note: rowToGame uses direct cast, so null/undefined from DB becomes empty string or falsy
      expect(game.installation.installPath).toBeFalsy();
      expect(game.installation.installSize).toBeFalsy();
      expect(game.installation.executablePath).toBeFalsy();
      expect(game.installation.runner).toBeFalsy();
    });
  });
});
