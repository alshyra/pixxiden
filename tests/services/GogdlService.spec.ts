/**
 * GogdlService tests
 * Tests for GOG store service via gogdl CLI + GOG Galaxy API
 *
 * Auth flow: OAuth URL (client-side) → user pastes code → gogdl exchanges tokens.
 * gogdl stores tokens in its own config. We track auth state in auth_tokens table.
 *
 * Game listing: GOG Galaxy API (https://embed.gog.com/user/data/games) → game IDs
 * → gogdl info for each game → Game objects.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GogdlService } from "@/services/stores/GogdlService";
import type { SidecarService, SidecarResult } from "@/services/base/SidecarService";
import type { DatabaseService } from "@/services/base/DatabaseService";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock @tauri-apps/api/path
vi.mock("@tauri-apps/api/path", () => ({
  appConfigDir: vi.fn().mockResolvedValue("/mock/config/pixxiden/"),
}));

// Mock @tauri-apps/plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  exists: vi.fn().mockResolvedValue(false),
}));

// Mock @tauri-apps/plugin-http
const mockFetch = vi.fn();
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
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
    select: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
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
    vi.clearAllMocks();
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

  describe("getCapabilities", () => {
    it("should declare save sync support", () => {
      const caps = service.getCapabilities();
      expect(caps.canSyncSaves).toBe(true);
      expect(caps.canListGames).toBe(true);
      expect(caps.canInstall).toBe(true);
      expect(caps.canLaunch).toBe(true);
      expect(caps.canGetInfo).toBe(true);
    });
  });

  describe("listGames", () => {
    it("should return empty array when no access token found", async () => {
      // No token file exists (default mock: exists returns false)
      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should fetch owned games from Galaxy API and get info via gogdl", async () => {
      // Mock token file exists and has valid token
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(
        JSON.stringify({ access_token: "test-token", refresh_token: "refresh" }),
      );

      // Mock Galaxy API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ owned: [1234567890, 9876543210] }),
      });

      // Mock gogdl info for each game
      vi.mocked(mockSidecar.runGogdl)
        .mockResolvedValueOnce(
          createResult(
            JSON.stringify({ title: "The Witcher 3", cloudSaves: [{ location: "/saves" }] }),
          ),
        )
        .mockResolvedValueOnce(createResult(JSON.stringify({ title: "Cyberpunk 2077" })));

      const games = await service.listGames();

      expect(games).toHaveLength(2);
      expect(games[0].info.title).toBe("The Witcher 3");
      expect(games[0].storeData.storeId).toBe("1234567890");
      expect(games[0].storeData.store).toBe("gog");
      expect(games[0].installation.cloudSaveSupport).toBe(true);
      expect(games[1].info.title).toBe("Cyberpunk 2077");
      expect(games[1].installation.cloudSaveSupport).toBe(false);

      // Verify Galaxy API was called with bearer token
      expect(mockFetch).toHaveBeenCalledWith("https://embed.gog.com/user/data/games", {
        headers: { Authorization: "Bearer test-token" },
      });
    });

    it("should still add game with generic title when gogdl info fails", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(
        JSON.stringify({ access_token: "test-token", refresh_token: "refresh" }),
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ owned: [111] }),
      });

      // gogdl info fails
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("", 1, "not found"));

      const games = await service.listGames();

      expect(games).toHaveLength(1);
      expect(games[0].info.title).toBe("GOG Game 111");
      expect(games[0].id).toBe("gog-111");
    });

    it("should return empty array when Galaxy API returns error", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(
        JSON.stringify({ access_token: "expired-token", refresh_token: "refresh" }),
      );

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });
  });

  describe("getGameInfo", () => {
    it("should call gogdl info with correct args", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult(JSON.stringify({ title: "Test Game", slug: "test-game" })),
      );

      const info = await service.getGameInfo("12345");

      expect(info).toEqual({ title: "Test Game", slug: "test-game" });
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "/mock/config/pixxiden/gog",
        "info",
        "12345",
        "--json",
      ]);
    });

    it("should return null when gogdl info fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("", 1, "error"));

      const info = await service.getGameInfo("12345");
      expect(info).toBeNull();
    });
  });

  describe("getAuthUrl", () => {
    it("should return GOG OAuth URL with correct parameters", () => {
      const url = service.getAuthUrl();
      expect(url).toContain("https://auth.gog.com/auth");
      expect(url).toContain("client_id=46899977096215655");
      expect(url).toContain("response_type=code");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("layout=client2");
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no auth marker in DB", async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(null);

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
      expect(mockDb.queryOne).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
    });

    it("should return true when auth marker exists in DB", async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce({
        access_token: "gogdl-managed",
      });

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });

    it("should return false when DB query fails", async () => {
      vi.mocked(mockDb.queryOne).mockRejectedValueOnce(new Error("DB error"));

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("authenticate", () => {
    it("should pass code to gogdl sidecar and persist auth marker", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("Successfully authenticated"),
      );

      await service.authenticate("auth-code-123");

      // Should call gogdl with auth args
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "/mock/config/pixxiden/gog",
        "auth",
        "--code",
        "auth-code-123",
      ]);

      // Should persist auth marker in DB
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO auth_tokens"),
      );
    });

    it("should throw error when gogdl authentication fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(createResult("", 1, "Invalid code"));

      await expect(service.authenticate("invalid")).rejects.toThrow(
        "GOG authentication failed: Invalid code",
      );

      // Should NOT persist auth marker on failure
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should remove auth marker from database", async () => {
      await service.logout();

      expect(mockDb.execute).toHaveBeenCalledWith("DELETE FROM auth_tokens WHERE store = 'gog'");
    });
  });

  describe("syncSaves", () => {
    it("should call gogdl save-sync with correct args", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("Saves synced successfully"),
      );

      await service.syncSaves("12345", "/games/witcher3");

      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        "/mock/config/pixxiden/gog",
        "save-sync",
        "12345",
        "--path",
        "/games/witcher3",
      ]);
    });

    it("should throw error when save-sync fails", async () => {
      vi.mocked(mockSidecar.runGogdl).mockResolvedValueOnce(
        createResult("", 1, "Save sync failed"),
      );

      await expect(service.syncSaves("12345", "/path")).rejects.toThrow(
        "GOG save sync failed: Save sync failed",
      );
    });
  });
});
