/**
 * SteamService tests
 * Tests for Steam store service (local library reading + web API)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Tauri APIs before importing SteamService
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(false),
  readDir: vi.fn().mockResolvedValue([]),
  readTextFile: vi.fn().mockResolvedValue(""),
  mkdir: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn().mockResolvedValue("/home/user"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
  appConfigDir: vi.fn().mockResolvedValue("/home/user/.config/pixxiden"),
}));

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn().mockResolvedValue({
    ok: true,
    data: { response: { games: [] } },
    text: async () => "<root></root>",
  }),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// Mock DatabaseService
vi.mock("@/services/base/DatabaseService", () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      init: vi.fn(),
      execute: vi.fn(),
      select: vi.fn(),
      queryOne: vi.fn(),
    })),
  },
}));

// Mock SidecarService
vi.mock("@/services/base/SidecarService", () => ({
  SidecarService: {
    getInstance: vi.fn(() => ({
      runLegendary: vi.fn(),
      runGogdl: vi.fn(),
      runNile: vi.fn(),
    })),
  },
}));

describe("SteamService", () => {
  let service: any; // Using any to access getInstance

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import fresh to get mocked dependencies
    const { SteamService } = await import("@/services/stores/SteamService");
    service = SteamService.getInstance();
  });

  describe("storeName", () => {
    it("should return 'steam'", () => {
      expect(service.storeName).toBe("steam");
    });
  });

  describe("capabilities", () => {
    it("should return correct capabilities", () => {
      const capabilities = service.getCapabilities();
      expect(capabilities.canListGames).toBe(true);
      expect(capabilities.canLaunch).toBe(true);
    });
  });

  describe("listGames", () => {
    it("should handle missing Steam installation gracefully", async () => {
      const games = await service.listGames();
      // Should return empty array when Steam not found and no config
      expect(Array.isArray(games)).toBe(true);
    });
  });

  describe("isInstalled", () => {
    it("should return false when Steam not found", async () => {
      const result = await service.isInstalled();
      // With mocked fs returning no files, should be false
      expect(result).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("should return true (Steam handles its own auth)", async () => {
      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });
  });

  describe("getSteamAppId", () => {
    it("should return null when no games found", async () => {
      const result = await service.getSteamAppId("Some Game");
      expect(result).toBeNull();
    });
  });
});
