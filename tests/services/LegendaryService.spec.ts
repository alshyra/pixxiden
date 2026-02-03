/**
 * LegendaryService tests
 * Tests for Epic Games store service via legendary CLI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LegendaryService } from "@/services/stores/LegendaryService";
import type { SidecarService, SidecarResult } from "@/services/base/SidecarService";
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

// Helper to create sidecar result
const createResult = (stdout: string, code = 0, stderr = ""): SidecarResult => ({
  stdout,
  stderr,
  code,
});

describe("LegendaryService", () => {
  let service: LegendaryService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new LegendaryService(
      mockSidecar as unknown as SidecarService,
      mockDb as unknown as DatabaseService,
    );
  });

  describe("storeName", () => {
    it("should return 'epic'", () => {
      expect(service.storeName).toBe("epic");
    });
  });

  describe("listGames", () => {
    it("should list games from legendary CLI", async () => {
      const mockGames = [
        {
          app_name: "Fortnite",
          title: "Fortnite",
          is_installed: false,
          developer: "Epic Games",
        },
        {
          app_name: "RocketLeague",
          title: "Rocket League",
          is_installed: false,
          developer: "Psyonix",
        },
      ];

      const mockInstalled = [
        {
          app_name: "Fortnite",
          title: "Fortnite",
          is_installed: true,
          install_path: "/home/user/Games/Fortnite",
          install_size: 32212254720, // 30 GB
          executable: "/home/user/Games/Fortnite/FortniteClient-Linux-Shipping",
        },
      ];

      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult(JSON.stringify(mockInstalled)));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();

      expect(games).toHaveLength(2);

      // Check Fortnite (installed)
      const fortnite = games.find((g) => g.storeId === "Fortnite");
      expect(fortnite).toBeDefined();
      expect(fortnite?.id).toBe("epic-Fortnite");
      expect(fortnite?.store).toBe("epic");
      expect(fortnite?.title).toBe("Fortnite");
      expect(fortnite?.installed).toBe(true);
      expect(fortnite?.installPath).toBe("/home/user/Games/Fortnite");
      expect(fortnite?.installSize).toBe("30.0 GB");

      // Check Rocket League (not installed)
      const rocketLeague = games.find((g) => g.storeId === "RocketLeague");
      expect(rocketLeague).toBeDefined();
      expect(rocketLeague?.installed).toBe(false);
      expect(rocketLeague?.installPath).toBeUndefined();

      // Verify sidecar was called correctly
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["list", "--json"]);
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["list-installed", "--json"]);
    });

    it("should throw error when legendary list fails", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult("", 1, "Connection failed"),
      );

      await expect(service.listGames()).rejects.toThrow("Legendary list failed: Connection failed");
    });

    it("should throw error when JSON parsing fails", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(createResult("invalid json"));

      await expect(service.listGames()).rejects.toThrow("Failed to parse Legendary output");
    });

    it("should handle empty game list", async () => {
      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult("[]"))
        .mockResolvedValueOnce(createResult("[]"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should continue if list-installed fails", async () => {
      const mockGames = [{ app_name: "TestGame", title: "Test Game", is_installed: false }];

      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult("", 1, "Not logged in"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].installed).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when user has account", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult(JSON.stringify({ account: "user@example.com" })),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["status", "--json"]);
    });

    it("should return false when status fails", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(createResult("", 1, "Error"));

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });

    it("should return false when no account", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult(JSON.stringify({ account: null })),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });

    it("should return false on invalid JSON", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(createResult("not json"));

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("authenticate", () => {
    it("should authenticate with code", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult("Successfully logged in"),
      );

      await expect(service.authenticate("abc123")).resolves.toBeUndefined();

      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["auth", "--code", "abc123"]);
    });

    it("should throw error when authentication fails", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult("", 1, "Invalid code"),
      );

      await expect(service.authenticate("invalid")).rejects.toThrow(
        "Authentication failed: Invalid code",
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(createResult("Logged out"));

      await expect(service.logout()).resolves.toBeUndefined();
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["auth", "--delete"]);
    });

    it("should throw error when logout fails", async () => {
      vi.mocked(mockSidecar.runLegendary).mockResolvedValueOnce(
        createResult("", 1, "Not logged in"),
      );

      await expect(service.logout()).rejects.toThrow("Logout failed: Not logged in");
    });
  });
});
