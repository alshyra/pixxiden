/**
 * LegendaryService tests
 * Tests for Epic Games store service via legendary CLI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LegendaryService } from "@/services/stores/LegendaryService";
import type { SidecarService, SidecarResult } from "@/services/base/SidecarService";
import type { DatabaseService } from "@/services/base/DatabaseService";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

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
      // Real legendary output uses app_name, app_title, metadata.developer
      const mockGames = [
        {
          app_name: "Fortnite",
          app_title: "Fortnite",
          metadata: { developer: "Epic Games" },
        },
        {
          app_name: "RocketLeague",
          app_title: "Rocket League",
          metadata: { developer: "Psyonix" },
        },
      ];

      const mockInstalled = [
        {
          app_name: "Fortnite",
          title: "Fortnite",
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
      const fortnite = games.find((g) => g.storeData.storeId === "Fortnite");
      expect(fortnite).toBeDefined();
      expect(fortnite?.id).toBe("epic-Fortnite");
      expect(fortnite?.storeData.store).toBe("epic");
      expect(fortnite?.info.title).toBe("Fortnite");
      expect(fortnite?.installation.installed).toBe(true);
      expect(fortnite?.installation.installPath).toBe("/home/user/Games/Fortnite");
      expect(fortnite?.installation.installSize).toBe("30.0 GB");

      // Check Rocket League (not installed)
      const rocketLeague = games.find((g) => g.storeData.storeId === "RocketLeague");
      expect(rocketLeague).toBeDefined();
      expect(rocketLeague?.installation.installed).toBe(false);
      expect(rocketLeague?.installation.installPath).toBeFalsy();

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
      const mockGames = [{ app_name: "TestGame", app_title: "Test Game" }];

      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult("", 1, "Not logged in"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].installation.installed).toBe(false);
    });
  });

  describe("getAuthUrl", () => {
    it("should return the Epic Games authentication URL", () => {
      const url = service.getAuthUrl();
      expect(url).toBe("https://legendary.gl/epiclogin");
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when user has account and list succeeds", async () => {
      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult(JSON.stringify({ account: "user@example.com" })))
        .mockResolvedValueOnce(createResult("[]")); // list --json succeeds

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["status", "--json"]);
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["list", "--json"]);
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

    it("should return false when account exists but session is stale/expired", async () => {
      vi.mocked(mockSidecar.runLegendary)
        .mockResolvedValueOnce(createResult(JSON.stringify({ account: "user@example.com" })))
        .mockResolvedValueOnce(createResult("", 1, "Login failed: 401 Unauthorized"));

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
