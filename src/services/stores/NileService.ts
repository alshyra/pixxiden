/**
 * NileService - Amazon Games store via nile CLI
 *
 * CLI commands:
 * - `nile library list` - list owned games
 * - `nile library list --installed` - list installed games
 * - `nile auth --login` - login
 * - `nile auth --logout` - logout
 * Note: nile has no `auth --check` flag. We check auth by running `nile library list`.
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";

export interface NileAuthResult {
  success: boolean;
  requires2FA?: boolean;
  error?: string;
}

export class NileService extends GameStoreService {
  get storeName(): Game["store"] {
    return "amazon";
  }

  async listGames(): Promise<Game[]> {
    // First sync the library metadata
    const syncResult = await this.sidecar.runNile(["library", "sync"]);
    if (syncResult.code !== 0) {
      await warn(`nile library sync failed (code ${syncResult.code}): ${syncResult.stderr}`);
      // Don't throw — sync may fail but list might still work with cached data
    }

    // Get owned games
    const listResult = await this.sidecar.runNile(["library", "list"]);

    if (listResult.code !== 0) {
      await logError(`nile library list failed: ${listResult.stderr}`);
      throw new Error(`nile library list failed: ${listResult.stderr}`);
    }

    // nile library list outputs text lines like: "Game Title (ASIN: B0XXXXXX)"
    // Parse the text output
    const games: Game[] = [];
    const now = new Date().toISOString();
    const lines = listResult.stdout.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      // Pattern: "Game Title (ASIN: B0XXXXXX)" or "Game Title - ASIN: B0XXXXXX"
      const match = line.match(/^(.+?)\s*(?:\(ASIN:\s*|\s*-\s*ASIN:\s*)([A-Z0-9]+)\)?\s*$/);
      if (match) {
        const title = match[1].trim();
        const asin = match[2].trim();
        games.push({
          id: `amazon-${asin}`,
          storeId: asin,
          store: "amazon" as const,
          title,
          installed: false,
          genres: [],
          playTimeMinutes: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Check installed games
    const installedResult = await this.sidecar.runNile(["library", "list", "--installed"]);
    if (installedResult.code === 0) {
      const installedLines = installedResult.stdout.split("\n").filter((l) => l.trim());
      for (const line of installedLines) {
        const match = line.match(/(?:ASIN:\s*)([A-Z0-9]+)/);
        if (match) {
          const game = games.find((g) => g.storeId === match[1]);
          if (game) game.installed = true;
        }
      }
    }

    await debug(`nile: found ${games.length} games`);
    return games;
  }

  /**
   * Check if user is authenticated with Amazon.
   * nile has no --check flag. We try `nile library list` as a proxy.
   * If it errors with an auth-related message, user is not authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const result = await this.sidecar.runNile(["library", "list"]);
      // If exit code 0, we're authenticated
      // If it crashes with AttributeError (NoneType), user is not authenticated
      if (result.code !== 0) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(_email: string, _password: string): Promise<NileAuthResult> {
    const result = await this.sidecar.runNile(["auth", "--login", "--non-interactive"]);

    if (result.code === 0) {
      return { success: true };
    }

    // Check if 2FA is required
    if (
      result.stderr.toLowerCase().includes("2fa") ||
      result.stderr.toLowerCase().includes("two-factor") ||
      result.stderr.toLowerCase().includes("verification code")
    ) {
      return { success: false, requires2FA: true };
    }

    return { success: false, error: result.stderr };
  }

  /**
   * Login with 2FA code
   */
  async loginWith2FA(_email: string, _password: string, code: string): Promise<NileAuthResult> {
    const result = await this.sidecar.runNile(["register", "--code", code]);

    if (result.code === 0) {
      return { success: true };
    }

    return { success: false, error: result.stderr };
  }

  /**
   * Logout from Amazon Games
   */
  async logout(): Promise<void> {
    const result = await this.sidecar.runNile(["auth", "--logout"]);
    if (result.code !== 0) {
      throw new Error(`Amazon logout failed: ${result.stderr}`);
    }
  }
}
