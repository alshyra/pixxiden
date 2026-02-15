/**
 * GogdlService tests
 * Tests for GOG store service via GOG API + gogdl CLI
 *
 * Auth flow: OAuth URL (client-side) → user pastes code → gogdl exchanges tokens.
 * gogdl stores tokens in its own config. We track auth state in auth_tokens table.
 *
 * Game listing: GOG getFilteredProducts API → products with IDs + titles.
 * No gogdl info needed for listing (avoids "content system api" errors).
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
  join: vi
    .fn()
    .mockImplementation(async (...parts: string[]) => parts.join("/").replace(/\/+/g, "/")),
}));

// Mock @tauri-apps/plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
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

/** gogdl stores credentials keyed by this client_id */
const GOG_CLIENT_ID = "46899977096215655";

/** Helper: build gogdl-format token JSON */
function gogdlTokenJson(
  accessToken: string,
  refreshToken = "refresh",
  options?: { expired?: boolean },
): string {
  const loginTime = options?.expired
    ? Date.now() / 1000 - 7200 // 2 hours ago (expired)
    : Date.now() / 1000; // now (fresh)
  return JSON.stringify({
    [GOG_CLIENT_ID]: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      loginTime,
    },
  });
}

describe("GogdlService", () => {
  let service: GogdlService;
  let mockSidecar: ReturnType<typeof createMockSidecar>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = GogdlService.createWithDeps(
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
    /** Helper: build a getFilteredProducts API response */
    function productsResponse(
      products: Array<{ id: number; title: string; isGame?: boolean }>,
      totalPages = 1,
      page = 1,
    ) {
      return {
        ok: true,
        json: async () => ({
          products: products.map((p) => ({ ...p, isGame: p.isGame ?? true })),
          totalProducts: products.length,
          totalPages,
          page,
        }),
      };
    }

    it("should return empty array when no access token found", async () => {
      // No token file exists (default mock: exists returns false)
      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should fetch games from getFilteredProducts API with titles", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(gogdlTokenJson("test-token"));

      // Mock getFilteredProducts response — returns titles directly!
      mockFetch.mockResolvedValueOnce(
        productsResponse([
          { id: 1234567890, title: "The Witcher 3: Wild Hunt" },
          { id: 9876543210, title: "Cyberpunk 2077" },
        ]),
      );

      const games = await service.listGames();

      expect(games).toHaveLength(2);
      expect(games[0].info.title).toBe("The Witcher 3: Wild Hunt");
      expect(games[0].storeData.storeId).toBe("1234567890");
      expect(games[0].storeData.store).toBe("gog");
      expect(games[0].id).toBe("gog-1234567890");
      expect(games[1].info.title).toBe("Cyberpunk 2077");

      // Verify getFilteredProducts was called with bearer token
      expect(mockFetch).toHaveBeenCalledWith(
        "https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=1",
        { headers: { Authorization: "Bearer test-token" } },
      );

      // Should NOT call gogdl info — titles come from the API
      expect(mockSidecar.runGogdl).not.toHaveBeenCalled();
    });

    it("should filter out DLCs and non-game products", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(gogdlTokenJson("test-token"));

      mockFetch.mockResolvedValueOnce(
        productsResponse([
          { id: 1, title: "The Witcher 3: Wild Hunt", isGame: true },
          { id: 2, title: "The Witcher 3 - Expansion Pass", isGame: true },
          { id: 3, title: "Cyberpunk 2077 Soundtrack", isGame: true },
          { id: 4, title: "Some Movie", isGame: false },
          { id: 5, title: "DOOM Eternal", isGame: true },
        ]),
      );

      const games = await service.listGames();

      expect(games).toHaveLength(2);
      expect(games[0].info.title).toBe("The Witcher 3: Wild Hunt");
      expect(games[1].info.title).toBe("DOOM Eternal");
    });

    it("should handle pagination across multiple pages", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(gogdlTokenJson("test-token"));

      // Page 1
      mockFetch.mockResolvedValueOnce(productsResponse([{ id: 1, title: "Game A" }], 2, 1));
      // Page 2
      mockFetch.mockResolvedValueOnce(productsResponse([{ id: 2, title: "Game B" }], 2, 2));

      const games = await service.listGames();

      expect(games).toHaveLength(2);
      expect(games[0].info.title).toBe("Game A");
      expect(games[1].info.title).toBe("Game B");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when API returns error", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(gogdlTokenJson("expired-token"));

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
        "/mock/config/pixxiden/gog_auth.json",
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

    it("should return true when auth marker exists in DB AND token file exists", async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce({
        access_token: "gogdl-managed",
      });

      // Token file exists
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(true);

      const result = await service.isAuthenticated();
      expect(result).toBe(true);
    });

    it("should return false and clear stale marker when token file is missing", async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce({
        access_token: "gogdl-managed",
      });

      // Token file does NOT exist
      const { exists } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValueOnce(false);

      const result = await service.isAuthenticated();
      expect(result).toBe(false);
      // Should have cleared the stale DB marker
      expect(mockDb.execute).toHaveBeenCalledWith("DELETE FROM auth_tokens WHERE store = 'gog'");
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
        "/mock/config/pixxiden/gog_auth.json",
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
        "/mock/config/pixxiden/gog_auth.json",
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

  describe("token refresh", () => {
    it("should automatically refresh expired token and list games", async () => {
      const { exists, readTextFile, writeTextFile } = await import("@tauri-apps/plugin-fs");

      // Token file exists but has an expired token
      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(
        gogdlTokenJson("expired-token", "my-refresh-token", { expired: true }),
      );

      // Mock token refresh response from GOG auth server
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-fresh-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      // Mock getFilteredProducts response with new token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [{ id: 42, title: "Refreshed Game", isGame: true }],
          totalProducts: 1,
          totalPages: 1,
          page: 1,
        }),
      });

      const games = await service.listGames();

      // Should have refreshed the token
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // First call: token refresh
      expect(mockFetch.mock.calls[0][0]).toContain("auth.gog.com/token");
      expect(mockFetch.mock.calls[0][0]).toContain("grant_type=refresh_token");
      expect(mockFetch.mock.calls[0][0]).toContain("refresh_token=my-refresh-token");
      // Second call: getFilteredProducts
      expect(mockFetch.mock.calls[1][0]).toContain("getFilteredProducts");
      expect(mockFetch.mock.calls[1][1]).toEqual({
        headers: { Authorization: "Bearer new-fresh-token" },
      });

      // Should have written updated token to file
      expect(writeTextFile).toHaveBeenCalled();

      expect(games).toHaveLength(1);
      expect(games[0].info.title).toBe("Refreshed Game");
    });

    it("should return empty when token refresh fails", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(
        gogdlTokenJson("expired-token", "bad-refresh-token", { expired: true }),
      );

      // Token refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should return empty when no refresh token is available", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValueOnce(true);
      // Expired token with empty refresh_token
      vi.mocked(readTextFile).mockResolvedValueOnce(
        JSON.stringify({
          [GOG_CLIENT_ID]: {
            access_token: "expired-token",
            refresh_token: "",
            expires_in: 3600,
            loginTime: Date.now() / 1000 - 7200,
          },
        }),
      );

      const games = await service.listGames();
      expect(games).toHaveLength(0);
    });

    it("should use token directly when not expired", async () => {
      const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce(gogdlTokenJson("fresh-token"));

      // getFilteredProducts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [],
          totalProducts: 0,
          totalPages: 1,
          page: 1,
        }),
      });

      await service.listGames();

      // Should call getFilteredProducts only (no refresh call)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=1",
        { headers: { Authorization: "Bearer fresh-token" } },
      );
    });
  });
});
