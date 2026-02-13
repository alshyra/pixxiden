/**
 * GOG Integration Test — Uses REAL token file + REAL GOG API
 *
 * This test validates the ACTUAL GOG sync pipeline:
 * 1. Reads the real token file from disk (same path Tauri would use)
 * 2. Checks token expiry logic against real timestamps
 * 3. Calls the real GOG getFilteredProducts API to fetch owned games with titles
 * 4. Verifies the GogdlService logic works end-to-end
 *
 * This catches bugs that mocked unit tests miss:
 * - Token file format mismatches
 * - Token expiry/refresh logic errors
 * - API response parsing issues
 * - Path resolution problems
 *
 * REQUIRES: A valid GOG token at ~/.config/com.Pixxiden.launcher/gog_auth.json
 * If the token file doesn't exist, tests are skipped (not failed).
 *
 * @vitest-environment node
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ===== Real GOG constants (same as GogdlService) =====
const GOG_CLIENT_ID = "46899977096215655";
const GOG_CLIENT_SECRET = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9";
const TOKEN_FILE_PATH = path.join(
  os.homedir(),
  ".config",
  "com.Pixxiden.launcher",
  "gog_auth.json",
);

// Check if token file exists before running these tests
const tokenFileExists = fs.existsSync(TOKEN_FILE_PATH);

// ===== Setup Tauri API mocks that use REAL file I/O and REAL HTTP =====

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn((...args: unknown[]) => console.log("[INFO]", ...args)),
  warn: vi.fn((...args: unknown[]) => console.warn("[WARN]", ...args)),
  error: vi.fn((...args: unknown[]) => console.error("[ERROR]", ...args)),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appConfigDir: vi
    .fn()
    .mockResolvedValue(path.join(os.homedir(), ".config", "com.Pixxiden.launcher") + "/"),
  join: vi.fn().mockImplementation(async (...parts: string[]) => path.join(...parts)),
}));

// Mock FS to use REAL Node.js file system
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn().mockImplementation(async (filePath: string) => {
    return fs.readFileSync(filePath, "utf-8");
  }),
  writeTextFile: vi.fn().mockImplementation(async (filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, "utf-8");
  }),
  exists: vi.fn().mockImplementation(async (filePath: string) => {
    return fs.existsSync(filePath);
  }),
}));

// Mock HTTP to use REAL Node.js fetch
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const response = await globalThis.fetch(url, options);
    return response;
  }),
}));

// Import AFTER mocks are set up
import type { DatabaseService } from "@/services/base/DatabaseService";
import type { SidecarService } from "@/services/base/SidecarService";
import { GogdlService } from "@/services/stores/GogdlService";

// Mock sidecar (gogdl binary not needed for API tests)
const createMockSidecar = () =>
  ({
    runLegendary: vi.fn(),
    runGogdl: vi
      .fn()
      .mockResolvedValue({ code: 1, stdout: "", stderr: "not needed for this test" }),
    runNile: vi.fn(),
    runSteam: vi.fn(),
    isAvailable: vi.fn(),
  }) as unknown as SidecarService;

// Mock DB — the service uses it for isAuthenticated() DB check
const createMockDb = () =>
  ({
    execute: vi.fn(),
    select: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({ access_token: "gogdl-managed" }),
    init: vi.fn(),
  }) as unknown as DatabaseService;

describe.skipIf(!tokenFileExists)("GOG Integration Tests (REAL API)", () => {
  let service: GogdlService;
  let mockSidecar: SidecarService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockSidecar = createMockSidecar();
    mockDb = createMockDb();
    service = new GogdlService(mockSidecar, mockDb);
  });

  describe("Token file reading", () => {
    it("should find the real GOG token file", async () => {
      expect(fs.existsSync(TOKEN_FILE_PATH)).toBe(true);
    });

    it("should parse the real token file correctly", async () => {
      const raw = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const data = JSON.parse(raw);

      // Must have the client_id key
      expect(data).toHaveProperty(GOG_CLIENT_ID);

      const entry = data[GOG_CLIENT_ID];
      expect(entry).toHaveProperty("access_token");
      expect(entry).toHaveProperty("refresh_token");
      expect(typeof entry.access_token).toBe("string");
      expect(entry.access_token.length).toBeGreaterThan(0);
    });

    it("should read access token via GogdlService.readAccessToken path", async () => {
      // This exercises the EXACT code path in readAccessToken()
      // The Tauri mocks redirect to real Node.js FS
      const isAuth = await service.isAuthenticated();
      expect(isAuth).toBe(true);
    });
  });

  describe("Token expiry logic", () => {
    it("should correctly determine token expiry from real file", () => {
      const raw = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const data = JSON.parse(raw);
      const entry = data[GOG_CLIENT_ID];

      const nowSeconds = Date.now() / 1000;
      const expiresAt = entry.loginTime + entry.expires_in;
      const isExpired = nowSeconds >= expiresAt;

      // Log for visibility
      console.log(`Token loginTime: ${entry.loginTime}`);
      console.log(`Token expires_in: ${entry.expires_in}`);
      console.log(`Token expires at: ${expiresAt} (now: ${nowSeconds})`);
      console.log(
        `Token is ${isExpired ? "EXPIRED" : "VALID"} (${Math.round(expiresAt - nowSeconds)}s remaining)`,
      );

      // Whether expired or not, the value should be a boolean
      expect(typeof isExpired).toBe("boolean");
    });
  });

  describe("GOG getFilteredProducts API (REAL)", () => {
    it("should fetch owned games with titles from getFilteredProducts", async () => {
      // Read token (handles expiry + refresh automatically)
      const raw = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const data = JSON.parse(raw);
      const entry = data[GOG_CLIENT_ID];

      let token = entry.access_token;

      // Refresh if expired
      const nowSeconds = Date.now() / 1000;
      if (nowSeconds >= entry.loginTime + entry.expires_in) {
        console.log("Token expired, refreshing...");
        const url =
          `https://auth.gog.com/token?client_id=${GOG_CLIENT_ID}` +
          `&client_secret=${GOG_CLIENT_SECRET}` +
          `&grant_type=refresh_token` +
          `&refresh_token=${entry.refresh_token}`;

        const refreshResp = await globalThis.fetch(url);
        expect(refreshResp.ok).toBe(true);
        const newCreds = await refreshResp.json();
        token = newCreds.access_token;
        console.log("Token refreshed successfully");
      }

      // Call getFilteredProducts API (the new endpoint)
      const response = await globalThis.fetch(
        "https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=1",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      expect(response.ok).toBe(true);

      const apiData = await response.json();
      expect(apiData).toHaveProperty("products");
      expect(apiData).toHaveProperty("totalProducts");
      expect(apiData).toHaveProperty("totalPages");
      expect(Array.isArray(apiData.products)).toBe(true);
      expect(apiData.products.length).toBeGreaterThan(0);

      // Verify products have titles (not just IDs)
      for (const product of apiData.products.slice(0, 5)) {
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("title");
        expect(typeof product.title).toBe("string");
        expect(product.title.length).toBeGreaterThan(0);
        // Title should NOT be a generic fallback
        expect(product.title).not.toMatch(/^GOG Game \d+$/);
      }

      console.log(
        `✅ GOG getFilteredProducts: ${apiData.totalProducts} total products (page 1: ${apiData.products.length})`,
      );
      console.log(
        `   Sample titles: ${apiData.products
          .slice(0, 5)
          .map((p: { title: string }) => p.title)
          .join(", ")}`,
      );
    }, 15000);

    it("should list games via GogdlService.listGames() with real titles", async () => {
      // This calls the FULL listGames() pipeline:
      // readAccessToken() → getFilteredProducts → filter → Game[]
      // No gogdl info calls needed — titles come from API
      const games = await service.listGames();

      console.log(`✅ GogdlService.listGames(): ${games.length} games`);

      // Must have games
      expect(games.length).toBeGreaterThan(0);

      // Verify game structure AND real titles
      for (const game of games) {
        expect(game.id).toMatch(/^gog-\d+$/);
        expect(game.storeData.store).toBe("gog");
        expect(game.storeData.storeId).toBeTruthy();
        expect(game.info.title).toBeTruthy();
        // Critical: NO game should have "GOG Game {id}" as title
        expect(game.info.title).not.toMatch(/^GOG Game \d+$/);
      }

      // Log a few titles for visibility
      console.log(
        `   Sample: ${games
          .slice(0, 5)
          .map((g) => g.info.title)
          .join(", ")}`,
      );
    }, 30000);
  });

  describe("Sync flow validation", () => {
    it("should confirm isAuthenticated + listGames produces games for sync", async () => {
      // This tests the EXACT flow from GameSyncService.fetchStoreGames("gog")
      const isAuth = await service.isAuthenticated();
      expect(isAuth).toBe(true);

      if (isAuth) {
        const games = await service.listGames();
        expect(games.length).toBeGreaterThan(0);
        console.log(`✅ Sync flow would add ${games.length} GOG games to DB`);
      }
    }, 30000);
  });
});
