/**
 * SteamService tests
 * Tests for Steam store service (local library reading)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SteamService } from "@/services/stores/SteamService";
import type { SidecarService } from "@/services/base/SidecarService";
import type { DatabaseService } from "@/services/base/DatabaseService";

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

describe("SteamService", () => {
  let service: SteamService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new SteamService(
      mockSidecar as unknown as SidecarService,
      mockDb as unknown as DatabaseService,
    );
  });

  describe("storeName", () => {
    it("should return 'steam'", () => {
      expect(service.storeName).toBe("steam");
    });
  });

  describe("listGames", () => {
    it("should return empty array (not yet implemented)", async () => {
      const games = await service.listGames();
      expect(games).toEqual([]);
    });
  });

  describe("isInstalled", () => {
    it("should return true (assumes Steam might be installed)", async () => {
      const result = await service.isInstalled();
      expect(result).toBe(true);
    });
  });

  describe("isAuthenticated", () => {
    it("should return true (Steam handles its own auth)", async () => {
      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });
  });

  describe("getSteamAppId", () => {
    it("should return null (not yet implemented)", async () => {
      const result = await service.getSteamAppId("Some Game");
      expect(result).toBeNull();
    });
  });
});
