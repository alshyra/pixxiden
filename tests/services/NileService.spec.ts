/**
 * NileService tests
 * Tests for Amazon Games store service via nile CLI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NileService } from "@/services/stores/NileService";
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

describe("NileService", () => {
  let service: NileService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new NileService(
      mockSidecar as unknown as SidecarService,
      mockDb as unknown as DatabaseService,
    );
  });

  describe("storeName", () => {
    it("should return 'amazon'", () => {
      expect(service.storeName).toBe("amazon");
    });
  });

  describe("listGames", () => {
    it("should list games from nile CLI", async () => {
      const mockGames = [
        {
          app_name: "NewWorldAmazon",
          title: "New World",
          developer: "Amazon Games",
        },
        {
          app_name: "LostArkAmazon",
          title: "Lost Ark",
          developer: "Smilegate RPG",
        },
      ];

      const mockInstalled = [
        {
          app_name: "NewWorldAmazon",
          title: "New World",
          is_installed: true,
          install_path: "/home/user/Games/NewWorld",
          install_size: 85000000000, // ~79 GB
          executable: "/home/user/Games/NewWorld/NewWorld.exe",
        },
      ];

      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult(JSON.stringify(mockInstalled)));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();

      expect(games).toHaveLength(2);

      // Check New World (installed)
      const newWorld = games.find((g) => g.storeId === "NewWorldAmazon");
      expect(newWorld).toBeDefined();
      expect(newWorld?.id).toBe("amazon-NewWorldAmazon");
      expect(newWorld?.store).toBe("amazon");
      expect(newWorld?.title).toBe("New World");
      expect(newWorld?.installed).toBe(true);
      expect(newWorld?.installPath).toBe("/home/user/Games/NewWorld");
      expect(newWorld?.installSize).toBe("79.2 GB");

      // Check Lost Ark (not installed)
      const lostArk = games.find((g) => g.storeId === "LostArkAmazon");
      expect(lostArk).toBeDefined();
      expect(lostArk?.installed).toBe(false);
      expect(lostArk?.installPath).toBeUndefined();

      // Verify sidecar was called correctly
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["library", "--json"]);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["list-installed", "--json"]);
    });

    it("should throw error when nile list fails", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "Not authenticated"),
      );

      await expect(service.listGames()).rejects.toThrow("nile list failed: Not authenticated");
    });

    it("should throw error when JSON parsing fails", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("invalid json"));

      await expect(service.listGames()).rejects.toThrow("Failed to parse nile output");
    });

    it("should handle empty game list", async () => {
      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("[]"))
        .mockResolvedValueOnce(createResult("[]"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should continue if list-installed fails", async () => {
      const mockGames = [{ app_name: "TestGame", title: "Test Game" }];

      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult("", 1, "Error"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].installed).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when auth check succeeds", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Authenticated"));

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["auth", "--check"]);
    });

    it("should return false when auth check fails", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "Not authenticated"),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("login", () => {
    it("should login successfully with email and password", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Successfully logged in"));

      const result = await service.login("user@example.com", "password123");

      expect(result.success).toBe(true);
      expect(result.requires2FA).toBeUndefined();
      expect(mockSidecar.runNile).toHaveBeenCalledWith([
        "auth",
        "--email",
        "user@example.com",
        "--password",
        "password123",
      ]);
    });

    it("should detect 2FA requirement", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "2FA verification code required"),
      );

      const result = await service.login("user@example.com", "password123");

      expect(result.success).toBe(false);
      expect(result.requires2FA).toBe(true);
    });

    it("should detect two-factor requirement", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "Two-factor authentication required"),
      );

      const result = await service.login("user@example.com", "password123");

      expect(result.success).toBe(false);
      expect(result.requires2FA).toBe(true);
    });

    it("should return error on failed login", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "Invalid credentials"),
      );

      const result = await service.login("user@example.com", "wrong");

      expect(result.success).toBe(false);
      expect(result.requires2FA).toBeUndefined();
      expect(result.error).toBe("Invalid credentials");
    });
  });

  describe("loginWith2FA", () => {
    it("should login with 2FA code", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Successfully logged in"));

      const result = await service.loginWith2FA("user@example.com", "password123", "123456");

      expect(result.success).toBe(true);
      expect(mockSidecar.runNile).toHaveBeenCalledWith([
        "auth",
        "--email",
        "user@example.com",
        "--password",
        "password123",
        "--2fa-code",
        "123456",
      ]);
    });

    it("should return error on invalid 2FA code", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("", 1, "Invalid 2FA code"));

      const result = await service.loginWith2FA("user@example.com", "password123", "000000");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid 2FA code");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Logged out"));

      await expect(service.logout()).resolves.toBeUndefined();
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["auth", "--logout"]);
    });

    it("should throw error when logout fails", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("", 1, "Error"));

      await expect(service.logout()).rejects.toThrow("Amazon logout failed: Error");
    });
  });
});
