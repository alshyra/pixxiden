/**
 * NileService tests
 * Tests for Amazon Games store service via nile CLI
 *
 * CLI commands (actual):
 * - `nile library sync` - sync library metadata
 * - `nile library list` - list owned games (text output)
 * - `nile library list --installed` - list installed games
 * - `nile auth --login --non-interactive` - login
 * - `nile auth --logout` - logout
 * - `nile register --code <code>` - 2FA registration
 *
 * Note: nile has no `auth --check` flag. isAuthenticated uses `library list` as proxy.
 * Output format: "Game Title (ASIN: B0XXXXXX)" per line.
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
    it("should parse text output from nile library list", async () => {
      const listOutput = ["New World (ASIN: B08CF3J4R2)", "Lost Ark (ASIN: B09NQGDZZ6)"].join("\n");

      const installedOutput = "New World (ASIN: B08CF3J4R2)\n";

      // sync → list → list --installed
      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("")) // library sync
        .mockResolvedValueOnce(createResult(listOutput)) // library list
        .mockResolvedValueOnce(createResult(installedOutput)); // library list --installed

      const games = await service.listGames();

      expect(games).toHaveLength(2);

      // Check New World (installed)
      const newWorld = games.find((g) => g.storeId === "B08CF3J4R2");
      expect(newWorld).toBeDefined();
      expect(newWorld?.id).toBe("amazon-B08CF3J4R2");
      expect(newWorld?.store).toBe("amazon");
      expect(newWorld?.title).toBe("New World");
      expect(newWorld?.installed).toBe(true);

      // Check Lost Ark (not installed)
      const lostArk = games.find((g) => g.storeId === "B09NQGDZZ6");
      expect(lostArk).toBeDefined();
      expect(lostArk?.installed).toBe(false);

      // Verify sidecar calls
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["library", "sync"]);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["library", "list"]);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["library", "list", "--installed"]);
    });

    it("should throw error when nile library list fails", async () => {
      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("")) // sync
        .mockResolvedValueOnce(createResult("", 1, "Not authenticated")); // list

      await expect(service.listGames()).rejects.toThrow(
        "nile library list failed: Not authenticated",
      );
    });

    it("should handle empty output", async () => {
      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("")) // sync
        .mockResolvedValueOnce(createResult("")) // list (empty)
        .mockResolvedValueOnce(createResult("")); // list --installed

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should continue if sync fails", async () => {
      const listOutput = "Test Game (ASIN: B0TEST1234)\n";

      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("", 1, "sync error")) // sync fails
        .mockResolvedValueOnce(createResult(listOutput)) // list still works
        .mockResolvedValueOnce(createResult("")); // list --installed

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].title).toBe("Test Game");
    });

    it("should continue if list-installed fails", async () => {
      const listOutput = "Test Game (ASIN: B0TEST1234)\n";

      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("")) // sync
        .mockResolvedValueOnce(createResult(listOutput)) // list
        .mockResolvedValueOnce(createResult("", 1, "Error")); // list --installed fails

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].installed).toBe(false);
    });

    it("should parse alternate ASIN format (dash separator)", async () => {
      const listOutput = "Test Game - ASIN: B0TEST1234\n";

      vi.mocked(mockSidecar.runNile)
        .mockResolvedValueOnce(createResult("")) // sync
        .mockResolvedValueOnce(createResult(listOutput)) // list
        .mockResolvedValueOnce(createResult("")); // list --installed

      const games = await service.listGames();
      expect(games).toHaveLength(1);
      expect(games[0].title).toBe("Test Game");
      expect(games[0].storeId).toBe("B0TEST1234");
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when library list succeeds (exit code 0)", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("Test Game (ASIN: B0TEST)"),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["library", "list"]);
    });

    it("should return false when library list fails", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(
        createResult("", 1, "Not authenticated"),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });

    it("should return false on sidecar exception", async () => {
      vi.mocked(mockSidecar.runNile).mockRejectedValueOnce(new Error("Binary not found"));

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Successfully logged in"));

      const result = await service.login("user@example.com", "password123");

      expect(result.success).toBe(true);
      expect(result.requires2FA).toBeUndefined();
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["auth", "--login", "--non-interactive"]);
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
    it("should register with 2FA code", async () => {
      vi.mocked(mockSidecar.runNile).mockResolvedValueOnce(createResult("Successfully logged in"));

      const result = await service.loginWith2FA("user@example.com", "password123", "123456");

      expect(result.success).toBe(true);
      expect(mockSidecar.runNile).toHaveBeenCalledWith(["register", "--code", "123456"]);
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
