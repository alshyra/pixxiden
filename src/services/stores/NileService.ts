/**
 * NileService - Amazon Games store via nile CLI
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";

interface NileGame {
  app_name: string;
  title: string;
  is_installed?: boolean;
  install_path?: string;
  install_size?: number;
  executable?: string;
  developer?: string;
}

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
    // Get owned games
    const listResult = await this.sidecar.runNile(["library", "--json"]);

    if (listResult.code !== 0) {
      console.error("❌ nile list failed:", listResult.stderr);
      throw new Error(`nile list failed: ${listResult.stderr}`);
    }

    let rawGames: NileGame[];
    try {
      rawGames = JSON.parse(listResult.stdout);
    } catch {
      console.error("❌ Failed to parse nile output");
      throw new Error("Failed to parse nile output");
    }

    // Get installed games
    const installedResult = await this.sidecar.runNile(["list-installed", "--json"]);
    const installedGames: Record<string, NileGame> = {};

    if (installedResult.code === 0) {
      try {
        const installed: NileGame[] = JSON.parse(installedResult.stdout);
        for (const game of installed) {
          installedGames[game.app_name] = game;
        }
      } catch {
        console.warn("⚠️ Could not parse installed Amazon games");
      }
    }

    const now = new Date().toISOString();

    // Map to Game interface
    const games: Game[] = rawGames.map((g) => {
      const installed = installedGames[g.app_name];
      const isInstalled = Boolean(installed);

      return {
        id: `amazon-${g.app_name}`,
        storeId: g.app_name,
        store: "amazon" as const,
        title: g.title,
        installed: isInstalled,
        installPath: installed?.install_path,
        installSize: installed?.install_size ? this.formatSize(installed.install_size) : undefined,
        executablePath: installed?.executable,
        developer: g.developer,
        genres: [],
        playTimeMinutes: 0,
        createdAt: now,
        updatedAt: now,
      };
    });

    // Save to database
    await this.saveGames(games);

    console.log(
      `✅ nile: found ${games.length} games (${Object.keys(installedGames).length} installed)`,
    );
    return games;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const result = await this.sidecar.runNile(["auth", "--check"]);
    return result.code === 0;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<NileAuthResult> {
    const result = await this.sidecar.runNile(["auth", "--email", email, "--password", password]);

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
  async loginWith2FA(email: string, password: string, code: string): Promise<NileAuthResult> {
    const result = await this.sidecar.runNile([
      "auth",
      "--email",
      email,
      "--password",
      password,
      "--2fa-code",
      code,
    ]);

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

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }
}
