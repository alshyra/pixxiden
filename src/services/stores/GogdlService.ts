/**
 * GogdlService - GOG store via gogdl CLI + GOG Galaxy API
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
 * gogdl is a downloader — it cannot list owned games.
 * We use GOG Galaxy API (https://embed.gog.com/user/data/games) with
 * the access_token stored by gogdl in the auth config file.
 * For each game ID, gogdl `info` provides title and other metadata.
 */

import type { Game } from "@/types";
import { createGame } from "@/types";
import { GameStoreService, type StoreCapabilities } from "./GameStoreService";
import { debug, info, warn, error as logError } from "@tauri-apps/plugin-log";
import { appConfigDir } from "@tauri-apps/api/path";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";

/** Structure of gogdl's auth config JSON file (token.json inside auth-config-path) */
interface GogdlTokenData {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user_id?: string;
}

/** Response from GOG Galaxy API /user/data/games */
interface GogOwnedGamesResponse {
  owned: number[];
}

/** Partial response from gogdl info (JSON output) */
interface GogdlGameInfo {
  title?: string;
  slug?: string;
  cloudSaves?: { location?: string }[];
  dlcs?: string[];
}

export class GogdlService extends GameStoreService {
  /** Cached config path for gogdl auth tokens */
  private authConfigPath: string | null = null;

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
   * List GOG games by calling the GOG Galaxy API for owned game IDs,
   * then fetching basic info for each game via gogdl info.
   */
  async listGames(): Promise<Game[]> {
    const token = await this.readAccessToken();
    if (!token) {
      await warn("[GOG] No access token found — cannot list games");
      return [];
    }

    // 1. Fetch owned game IDs from GOG Galaxy API
    let ownedIds: number[];
    try {
      const response = await fetch("https://embed.gog.com/user/data/games", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await logError(`[GOG] Galaxy API returned ${response.status}`);
        return [];
      }

      const data = (await response.json()) as GogOwnedGamesResponse;
      ownedIds = data.owned ?? [];
      await info(`[GOG] Galaxy API: ${ownedIds.length} owned games`);
    } catch (err) {
      await logError(`[GOG] Failed to fetch owned games: ${err}`);
      return [];
    }

    if (ownedIds.length === 0) return [];

    // 2. Get info for each game via gogdl info
    const configPath = await this.getAuthConfigPath();
    const games: Game[] = [];

    for (const gogId of ownedIds) {
      try {
        const gameInfo = await this.getGameInfo(String(gogId), configPath);
        const title = gameInfo?.title ?? `GOG Game ${gogId}`;
        const hasCloudSaves = (gameInfo?.cloudSaves?.length ?? 0) > 0;

        games.push(
          createGame({
            id: `gog-${gogId}`,
            storeId: String(gogId),
            store: "gog",
            title,
            cloudSaveSupport: hasCloudSaves,
          }),
        );
      } catch {
        // If info fails for a game, still add it with a generic title
        games.push(
          createGame({
            id: `gog-${gogId}`,
            storeId: String(gogId),
            store: "gog",
            title: `GOG Game ${gogId}`,
          }),
        );
      }
    }

    await info(`[GOG] Listed ${games.length} games`);
    return games;
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
   * After a successful authenticate() call, we store a marker in auth_tokens.
   * We check that marker here.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const row = await this.db.queryOne<{ access_token: string }>(
        "SELECT access_token FROM auth_tokens WHERE store = 'gog'",
      );
      return row !== null;
    } catch {
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
   * gogdl stores tokens as a JSON file at the auth-config-path.
   */
  private async readAccessToken(): Promise<string | null> {
    try {
      const configPath = await this.getAuthConfigPath();
      // gogdl stores tokens in a file named after the path itself or inside it
      // Common patterns: {configPath}/token.json or {configPath} as the JSON file
      const possiblePaths = [`${configPath}/token.json`, configPath];

      for (const path of possiblePaths) {
        const fileExists = await exists(path);
        if (fileExists) {
          const content = await readTextFile(path);
          const tokenData = JSON.parse(content) as GogdlTokenData;
          if (tokenData.access_token) {
            await debug("[GOG] Read access token from gogdl config");
            return tokenData.access_token;
          }
        }
      }

      await warn("[GOG] No token file found at auth-config-path");
      return null;
    } catch (err) {
      await warn(`[GOG] Failed to read access token: ${err}`);
      return null;
    }
  }

  /**
   * Get the path where gogdl stores its auth config.
   * Uses Tauri's appConfigDir for a proper cross-platform path.
   */
  private async getAuthConfigPath(): Promise<string> {
    if (!this.authConfigPath) {
      try {
        const configDir = await appConfigDir();
        this.authConfigPath = `${configDir}gog`;
      } catch {
        // Fallback for tests or environments without Tauri
        this.authConfigPath = "~/.config/pixxiden/gog";
        await debug("[GOG] Using fallback auth config path");
      }
    }
    return this.authConfigPath;
  }
}
