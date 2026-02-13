/**
 * GogdlService - GOG store via GOG API + gogdl CLI
 *
 * Uses gogdl sidecar for authentication (token exchange + storage),
 * game download/installation, launching, and save-sync operations.
 *
 * Auth flow:
 * 1. getAuthUrl() → returns GOG OAuth URL (built client-side)
 * 2. User opens URL in browser, authorizes, gets redirect with code
 * 3. authenticate(code) → passes code to gogdl CLI for token exchange
 * 4. gogdl stores tokens in its own config at --auth-config-path
 *
 * Game listing:
 * Uses GOG's getFilteredProducts API which returns IDs AND titles.
 * This avoids calling `gogdl info` per game (which fails for many games
 * with "Game doesn't support content system api").
 */

import type { Game } from "@/types";
import { createGame } from "@/types";
import { GameStoreService, type StoreCapabilities } from "./GameStoreService";
import { debug, info, warn, error as logError } from "@tauri-apps/plugin-log";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { DatabaseService } from "../base/DatabaseService";
import { SidecarService } from "../base/SidecarService";

/**
 * gogdl's --auth-config-path points to a flat JSON file.
 * gogdl stores credentials keyed by client_id:
 *   { "46899977096215655": { access_token, refresh_token, expires_in, loginTime } }
 */
interface GogdlCredentialEntry {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  loginTime?: number;
}

/** The GOG OAuth client_id used by gogdl / Heroic */
const GOG_CLIENT_ID = "46899977096215655";

/** The GOG OAuth client_secret used by gogdl / Heroic (public credentials) */
const GOG_CLIENT_SECRET = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9";

/** DLC/non-game keyword patterns to filter out */
const DLC_KEYWORDS =
  /\b(DLC|Expansion Pass|Soundtrack|OST|Artbook|Art Book|Season Pass|Bonus Content)\b/i;

/** Single product from GOG getFilteredProducts API */
interface GogProduct {
  id: number;
  title: string;
  isGame: boolean;
  slug?: string;
  url?: string;
  category?: string;
  image?: string;
}

/** Response from GOG getFilteredProducts API */
interface GogFilteredProductsResponse {
  products: GogProduct[];
  totalProducts: number;
  totalPages: number;
  page: number;
}

/** Partial response from gogdl info (JSON output) */
interface GogdlGameInfo {
  title?: string;
  slug?: string;
  cloudSaves?: { location?: string }[];
  dlcs?: string[];
}

export class GogdlService extends GameStoreService {
  private static instance: GogdlService | null = null;

  /** Cached config path for gogdl auth tokens */
  private authConfigPath: string | null = null;

  private constructor() {
    super(SidecarService.getInstance(), DatabaseService.getInstance());
  }

  static getInstance(): GogdlService {
    if (!GogdlService.instance) {
      GogdlService.instance = new GogdlService();
    }
    return GogdlService.instance;
  }

  get storeName(): Game["storeData"]["store"] {
    return "gog";
  }

  getCapabilities(): StoreCapabilities {
    return {
      canListGames: true,
      canInstall: true,
      canLaunch: true,
      canGetInfo: true,
      canSyncSaves: true, // gogdl supports save-sync
    };
  }

  /**
   * List GOG games using the getFilteredProducts API.
   *
   * This API returns product IDs AND titles directly, avoiding the need
   * to call `gogdl info` per game (which fails for many games with
   * "Game doesn't support content system api").
   *
   * Flow:
   *   getFilteredProducts (paginated) → filter isGame + skip DLCs → Game[]
   */
  async listGames(): Promise<Game[]> {
    const token = await this.readAccessToken();
    if (!token) {
      await warn("[GOG] No access token found — cannot list games");
      return [];
    }

    // Fetch all products with pagination
    const allProducts = await this.fetchAllProducts(token);
    if (allProducts.length === 0) return [];

    // Filter: keep only actual games, skip DLCs/soundtracks
    const gameProducts = allProducts.filter((p) => p.isGame && !DLC_KEYWORDS.test(p.title));

    await info(
      `[GOG] ${allProducts.length} total products → ${gameProducts.length} games (filtered ${allProducts.length - gameProducts.length} DLCs/non-games)`,
    );

    // Map to Game objects — titles come from the API, no gogdl info needed
    const games: Game[] = gameProducts.map((product) =>
      createGame({
        id: `gog-${product.id}`,
        storeId: String(product.id),
        store: "gog",
        title: product.title,
      }),
    );

    await info(`[GOG] Listed ${games.length} games`);
    return games;
  }

  /**
   * Fetch all GOG products with pagination.
   * The getFilteredProducts endpoint returns at most ~50 products per page.
   */
  private async fetchAllProducts(token: string): Promise<GogProduct[]> {
    const allProducts: GogProduct[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      do {
        const url = `https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=${page}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          await logError(`[GOG] getFilteredProducts returned ${response.status} on page ${page}`);
          break;
        }

        const data = (await response.json()) as GogFilteredProductsResponse;
        allProducts.push(...(data.products ?? []));
        totalPages = data.totalPages ?? 1;

        await debug(
          `[GOG] Fetched page ${page}/${totalPages} (${data.products?.length ?? 0} products)`,
        );
        page++;
      } while (page <= totalPages);

      await info(`[GOG] Fetched ${allProducts.length} total products across ${totalPages} page(s)`);
    } catch (err) {
      await logError(`[GOG] Failed to fetch products: ${err}`);
    }

    return allProducts;
  }

  /**
   * Get info for a single game via gogdl info --json
   */
  async getGameInfo(gogId: string, configPath?: string): Promise<GogdlGameInfo | null> {
    const authPath = configPath ?? (await this.getAuthConfigPath());
    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      authPath,
      "info",
      gogId,
      "--json",
    ]);

    if (result.code !== 0) {
      await debug(`[GOG] info failed for ${gogId}: ${result.stderr}`);
      return null;
    }

    try {
      return JSON.parse(result.stdout) as GogdlGameInfo;
    } catch {
      await debug(`[GOG] Failed to parse info JSON for ${gogId}`);
      return null;
    }
  }

  /**
   * Check if user is authenticated with GOG.
   * Verifies both the DB marker AND the actual token file.
   * Clears stale DB markers if the token file is missing.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const row = await this.db.queryOne<{ access_token: string }>(
        "SELECT access_token FROM auth_tokens WHERE store = 'gog'",
      );
      if (!row) {
        await info("[GOG] isAuthenticated: no DB marker found");
        return false;
      }

      // Verify the actual token file exists
      const configPath = await this.getAuthConfigPath();
      await info(`[GOG] isAuthenticated: checking file at ${configPath}`);
      const fileExists = await exists(configPath);
      if (!fileExists) {
        // DB says authenticated but token file missing — clear stale marker
        await warn("[GOG] Auth marker found but token file missing — clearing stale auth");
        await this.db.execute("DELETE FROM auth_tokens WHERE store = 'gog'");
        return false;
      }

      await info("[GOG] isAuthenticated: DB marker + token file OK");
      return true;
    } catch (err) {
      await logError(`[GOG] isAuthenticated error: ${err}`);
      return false;
    }
  }

  /**
   * Get authentication URL for GOG OAuth.
   * Uses public credentials from gogdl/Heroic.
   */
  getAuthUrl(): string {
    return "https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=client2";
  }

  /**
   * Complete authentication with authorization code via gogdl CLI.
   * gogdl handles the token exchange and storage.
   * On success, we persist a marker in auth_tokens for isAuthenticated() checks.
   */
  async authenticate(code: string): Promise<void> {
    const configPath = await this.getAuthConfigPath();

    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      configPath,
      "auth",
      "--code",
      code,
    ]);

    if (result.code !== 0) {
      await logError(`[GOG] Authentication failed: ${result.stderr}`);
      throw new Error(`GOG authentication failed: ${result.stderr}`);
    }

    // Mark as authenticated in our DB (gogdl manages the actual tokens)
    await this.db.execute(
      `INSERT INTO auth_tokens (store, access_token, refresh_token, expires_at, config_source)
       VALUES ('gog', 'gogdl-managed', NULL, NULL, 'pixxiden')
       ON CONFLICT(store) DO UPDATE SET
         access_token = 'gogdl-managed',
         config_source = 'pixxiden'`,
    );

    await info("[GOG] Authentication successful via gogdl");
  }

  /**
   * Logout from GOG — remove auth marker and gogdl config
   */
  async logout(): Promise<void> {
    // Remove our auth marker
    await this.db.execute("DELETE FROM auth_tokens WHERE store = 'gog'");

    await info("[GOG] Logged out successfully");
  }

  /**
   * Sync cloud saves for a game
   * Uses gogdl save-sync command
   */
  async syncSaves(gogId: string, installPath: string): Promise<void> {
    const configPath = await this.getAuthConfigPath();

    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      configPath,
      "save-sync",
      gogId,
      "--path",
      installPath,
    ]);

    if (result.code !== 0) {
      await logError(`[GOG] Save sync failed for ${gogId}: ${result.stderr}`);
      throw new Error(`GOG save sync failed: ${result.stderr}`);
    }

    await info(`[GOG] Save sync completed for ${gogId}`);
  }

  // ===== Private Helpers =====

  /**
   * Public accessor for the auth config path.
   * Used by the orchestrator to build gogdl launch/download commands.
   */
  async getAuthConfigPathPublic(): Promise<string> {
    return this.getAuthConfigPath();
  }

  /**
   * Read the access token from gogdl's auth config file.
   * gogdl stores credentials as a JSON file at --auth-config-path.
   * Format: { "<client_id>": { access_token, refresh_token, expires_in, loginTime } }
   *
   * Automatically refreshes the token if expired (gogdl tokens expire after 1 hour).
   */
  private async readAccessToken(): Promise<string | null> {
    try {
      const configPath = await this.getAuthConfigPath();

      const fileExists = await exists(configPath);
      if (!fileExists) {
        await warn(`[GOG] Auth config file not found: ${configPath}`);
        return null;
      }

      const content = await readTextFile(configPath);
      const data = JSON.parse(content) as Record<string, GogdlCredentialEntry>;

      // gogdl keys credentials by client_id
      const entry = data[GOG_CLIENT_ID];
      if (!entry?.access_token) {
        await warn("[GOG] No valid credentials found in auth config file");
        return null;
      }

      // Check if token is expired (gogdl tokens expire after ~1 hour)
      if (this.isTokenExpired(entry)) {
        await info("[GOG] Access token expired, attempting refresh...");
        const refreshedToken = await this.refreshAccessToken(entry.refresh_token, data, configPath);
        if (refreshedToken) {
          return refreshedToken;
        }
        await warn("[GOG] Token refresh failed — cannot list games");
        return null;
      }

      await info("[GOG] Read valid access token from gogdl config");
      return entry.access_token;
    } catch (err) {
      await warn(`[GOG] Failed to read access token: ${err}`);
      return null;
    }
  }

  /**
   * Check if a GOG credential entry has expired.
   * Uses the same logic as gogdl: time.time() >= loginTime + expires_in
   */
  private isTokenExpired(entry: GogdlCredentialEntry): boolean {
    if (!entry.loginTime || !entry.expires_in) {
      // If no timing info, assume not expired (let the API call validate)
      return false;
    }
    const nowSeconds = Date.now() / 1000;
    const expiresAt = entry.loginTime + entry.expires_in;
    const isExpired = nowSeconds >= expiresAt;
    if (isExpired) {
      const expiredAgo = Math.round(nowSeconds - expiresAt);
      void debug(
        `[GOG] Token expired ${expiredAgo}s ago (loginTime=${entry.loginTime}, expires_in=${entry.expires_in})`,
      );
    }
    return isExpired;
  }

  /**
   * Refresh the GOG access token using the refresh_token.
   * Uses the same endpoint and credentials as gogdl's auth.py refresh_credentials().
   * On success, updates the config file so future reads get the fresh token.
   */
  private async refreshAccessToken(
    refreshToken: string,
    data: Record<string, GogdlCredentialEntry>,
    configPath: string,
  ): Promise<string | null> {
    if (!refreshToken) {
      await warn("[GOG] No refresh token available — cannot refresh");
      return null;
    }

    try {
      const url =
        `https://auth.gog.com/token?client_id=${GOG_CLIENT_ID}` +
        `&client_secret=${GOG_CLIENT_SECRET}` +
        `&grant_type=refresh_token` +
        `&refresh_token=${refreshToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        await logError(`[GOG] Token refresh HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const newCredentials = (await response.json()) as GogdlCredentialEntry;
      // Set loginTime like gogdl does (Unix seconds)
      newCredentials.loginTime = Date.now() / 1000;

      // Update in-memory data and persist to file
      data[GOG_CLIENT_ID] = newCredentials;
      await writeTextFile(configPath, JSON.stringify(data));

      await info("[GOG] Token refreshed successfully");
      return newCredentials.access_token;
    } catch (err) {
      await logError(`[GOG] Token refresh error: ${err}`);
      return null;
    }
  }

  /**
   * Get the path where gogdl stores its auth config.
   * This is a FILE path (not a directory) — gogdl writes JSON directly to it.
   * Uses Tauri's appConfigDir for a proper cross-platform path.
   */
  private async getAuthConfigPath(): Promise<string> {
    if (!this.authConfigPath) {
      try {
        const configDir = await appConfigDir();
        this.authConfigPath = await join(configDir, "gog_auth.json");
      } catch {
        // Fallback for tests or environments without Tauri
        this.authConfigPath = "~/.config/pixxiden/gog_auth.json";
        await debug("[GOG] Using fallback auth config path");
      }
    }
    return this.authConfigPath;
  }
}
