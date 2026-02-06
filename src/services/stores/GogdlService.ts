/**
 * GogdlService - GOG store via gogdl CLI
 *
 * IMPORTANT: gogdl is a downloader only (like the Heroic Games Launcher uses it).
 * It does NOT have a 'list' command to list owned games.
 * Listing owned GOG games requires direct GOG Galaxy API calls.
 * For now, listGames() returns [] and logs a warning.
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";
import { debug, warn } from "@tauri-apps/plugin-log";

export class GogdlService extends GameStoreService {
  get storeName(): Game["store"] {
    return "gog";
  }

  /**
   * List GOG games.
   * gogdl does NOT support listing owned games — it's a downloader only.
   * A future implementation would call GOG Galaxy API directly via HTTP.
   */
  async listGames(): Promise<Game[]> {
    await warn(
      "gogdl cannot list owned games (no 'list' command). GOG Galaxy API integration needed.",
    );
    return [];
  }

  /**
   * Check if user is authenticated with GOG.
   * gogdl stores auth tokens in a JSON file. We check if the file exists
   * and contains valid-looking tokens by running `gogdl auth` with the config path.
   * Since gogdl has no --check flag, we attempt a benign operation.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // gogdl doesn't have an auth check command.
      // We check if the auth config file path is accessible and has tokens.
      // For now, return false since GOG integration requires Galaxy API.
      await debug("GOG auth check: gogdl has no auth verification command, returning false");
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication URL for GOG
   */
  async getAuthUrl(): Promise<string> {
    return "https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=client2";
  }

  /**
   * Complete authentication with authorization code
   */
  async authenticate(code: string): Promise<void> {
    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      this.getAuthConfigPath(),
      "auth",
      "--code",
      code,
    ]);
    if (result.code !== 0) {
      throw new Error(`GOG authentication failed: ${result.stderr}`);
    }
  }

  /**
   * Logout from GOG
   */
  async logout(): Promise<void> {
    await warn("GOG logout: gogdl has no logout command");
  }

  private getAuthConfigPath(): string {
    // TODO: Get from app data directory
    return "~/.config/pixxiden/gog";
  }
}
