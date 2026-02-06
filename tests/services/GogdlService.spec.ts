/**
 * GogdlService tests
 * Tests for GOG store service via gogdl CLI
 *
 * IMPORTANT: gogdl is a downloader only — it cannot list owned games.
 * listGames() returns [] and isAuthenticated() returns false.
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
    it("should return empty array (gogdl cannot list games)", async () => {
      const games = await service.listGames();
      expect(games).toHaveLength(0);
      // Should NOT call sidecar at all
      expect(mockSidecar.runGogdl).not.toHaveBeenCalled();
    });
  });

  describe("isAuthenticated", () => {
    it("should return false (gogdl has no auth check)", async () => {
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
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce({
        stdout: "Successfully authenticated",
        stderr: "",
        code: 0,
      });

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
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce({
        stdout: "",
        stderr: "Invalid code",
        code: 1,
      });

      await expect(service.authenticate("invalid")).rejects.toThrow(
        "GOG authentication failed: Invalid code",
      );
    });
  });

  describe("logout", () => {
    it("should resolve without error (gogdl has no logout)", async () => {
      await expect(service.logout()).resolves.toBeUndefined();
    });
  });
});
