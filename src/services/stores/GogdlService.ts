/**
 * GogdlService - GOG store via gogdl CLI
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";

interface GogGame {
  id: string;
  title: string;
  is_installed?: boolean;
  install_path?: string;
  install_size?: number;
  executable?: string;
  platform?: string;
}

export class GogdlService extends GameStoreService {
  get storeName(): Game["store"] {
    return "gog";
  }

  async listGames(): Promise<Game[]> {
    // Get owned games
    const listResult = await this.sidecar.runGogdl([
      "--auth-config-path",
      this.getAuthConfigPath(),
      "list",
      "--json",
    ]);

    if (listResult.code !== 0) {
      console.error("❌ gogdl list failed:", listResult.stderr);
      throw new Error(`gogdl list failed: ${listResult.stderr}`);
    }

    let rawGames: GogGame[];
    try {
      rawGames = JSON.parse(listResult.stdout);
    } catch {
      console.error("❌ Failed to parse gogdl output");
      throw new Error("Failed to parse gogdl output");
    }

    // Get installed games
    const installedResult = await this.sidecar.runGogdl([
      "--auth-config-path",
      this.getAuthConfigPath(),
      "list-installed",
      "--json",
    ]);
    const installedGames: Record<string, GogGame> = {};

    if (installedResult.code === 0) {
      try {
        const installed: GogGame[] = JSON.parse(installedResult.stdout);
        for (const game of installed) {
          installedGames[game.id] = game;
        }
      } catch {
        console.warn("⚠️ Could not parse installed GOG games");
      }
    }

    const now = new Date().toISOString();

    // Map to Game interface
    const games: Game[] = rawGames.map((g) => {
      const installed = installedGames[g.id];
      const isInstalled = Boolean(installed);

      return {
        id: `gog-${g.id}`,
        storeId: g.id,
        store: "gog" as const,
        title: g.title,
        installed: isInstalled,
        installPath: installed?.install_path,
        installSize: installed?.install_size ? this.formatSize(installed.install_size) : undefined,
        executablePath: installed?.executable,
        genres: [],
        playTimeMinutes: 0,
        createdAt: now,
        updatedAt: now,
      };
    });

    // Save to database
    console.log(
      `✅ gogdl: found ${games.length} games (${Object.keys(installedGames).length} installed)`,
    );
    return games;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      this.getAuthConfigPath(),
      "auth",
      "--check",
    ]);
    return result.code === 0;
  }

  /**
   * Get authentication URL for GOG
   */
  async getAuthUrl(): Promise<string> {
    // GOG uses a different auth flow
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
    const result = await this.sidecar.runGogdl([
      "--auth-config-path",
      this.getAuthConfigPath(),
      "auth",
      "--logout",
    ]);
    if (result.code !== 0) {
      throw new Error(`GOG logout failed: ${result.stderr}`);
    }
  }

  private getAuthConfigPath(): string {
    // TODO: Get from app data directory
    return "~/.config/pixxiden/gog";
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }
}
