/**
 * GogdlService tests
 * Tests for GOG store service via gogdl CLI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GogdlService } from "@/services/stores/GogdlService";
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

describe("GogdlService", () => {
  let service: GogdlService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new GogdlService(
      mockSidecar as unknown as SidecarService,
      mockDb as unknown as DatabaseService,
    );
  });

  describe("storeName", () => {
    it("should return 'gog'", () => {
      expect(service.storeName).toBe("gog");
    });
  });

  describe("listGames", () => {
    it("should list games from gogdl CLI", async () => {
      const mockGames = [
        {
          id: "1207658930",
          title: "The Witcher 3: Wild Hunt",
        },
        {
          id: "1495134320",
          title: "Cyberpunk 2077",
        },
      ];

      const mockInstalled = [
        {
          id: "1207658930",
          title: "The Witcher 3: Wild Hunt",
          is_installed: true,
          install_path: "/home/user/Games/Witcher3",
          install_size: 50000000000, // ~46.5 GB
          executable: "/home/user/Games/Witcher3/bin/x64/witcher3.exe",
        },
      ];

      vi.mocked(mockSidecar.runGogdl)
        .mockResolvedValueOnce(createResult(JSON.stringify(mockGames)))
        .mockResolvedValueOnce(createResult(JSON.stringify(mockInstalled)));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();

      expect(games).toHaveLength(2);

      // Check Witcher 3 (installed)
      const witcher = games.find((g) => g.storeId === "1207658930");
      expect(witcher).toBeDefined();
      expect(witcher?.id).toBe("gog-1207658930");
      expect(witcher?.store).toBe("gog");
      expect(witcher?.title).toBe("The Witcher 3: Wild Hunt");
      expect(witcher?.installed).toBe(true);
      expect(witcher?.installPath).toBe("/home/user/Games/Witcher3");
      expect(witcher?.installSize).toBe("46.6 GB");

      // Check Cyberpunk 2077 (not installed)
      const cyberpunk = games.find((g) => g.storeId === "1495134320");
      expect(cyberpunk).toBeDefined();
      expect(cyberpunk?.installed).toBe(false);
      expect(cyberpunk?.installPath).toBeUndefined();

      // Verify sidecar was called with auth config
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "~/.config/pixxiden/gog",
        "list",
        "--json",
      ]);
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "~/.config/pixxiden/gog",
        "list-installed",
        "--json",
      ]);
    });

    it("should throw error when gogdl list fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("", 1, "Not authenticated"),
      );

      await expect(service.listGames()).rejects.toThrow("gogdl list failed: Not authenticated");
    });

    it("should throw error when JSON parsing fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("invalid json"));

      await expect(service.listGames()).rejects.toThrow("Failed to parse gogdl output");
    });

    it("should handle empty game list", async () => {
      vi.mocked(mockSidecar.runGogdl)
        .mockResolvedValueOnce(createResult("[]"))
        .mockResolvedValueOnce(createResult("[]"));

      vi.mocked(mockDb.execute).mockResolvedValue(undefined);

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should continue if list-installed fails", async () => {
      const mockGames = [{ id: "123", title: "Test Game" }];

      vi.mocked(mockSidecar.runGogdl)
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
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("Authenticated"));

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "~/.config/pixxiden/gog",
        "auth",
        "--check",
      ]);
    });

    it("should return false when auth check fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("", 1, "Not authenticated"),
      );

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("getAuthUrl", () => {
    it("should return GOG auth URL", async () => {
      const url = await service.getAuthUrl();
      expect(url).toContain("auth.gog.com");
      expect(url).toContain("client_id=");
    });
  });

  describe("authenticate", () => {
    it("should authenticate with code", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("Successfully authenticated"),
      );

      await expect(service.authenticate("auth-code-123")).resolves.toBeUndefined();

      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "~/.config/pixxiden/gog",
        "auth",
        "--code",
        "auth-code-123",
      ]);
    });

    it("should throw error when authentication fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("", 1, "Invalid code"));

      await expect(service.authenticate("invalid")).rejects.toThrow(
        "GOG authentication failed: Invalid code",
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("Logged out"));

      await expect(service.logout()).resolves.toBeUndefined();
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "~/.config/pixxiden/gog",
        "auth",
        "--logout",
      ]);
    });

    it("should throw error when logout fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("", 1, "Error"));

      await expect(service.logout()).rejects.toThrow("GOG logout failed: Error");
    });
  });
});
