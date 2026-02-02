/**
 * LegendaryService - Epic Games store via legendary CLI
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";

interface LegendaryGame {
  app_name: string;
  title: string;
  is_installed: boolean;
  install_path?: string;
  install_size?: number;
  executable?: string;
  version?: string;
  developer?: string;
  cloud_saves_supported?: boolean;
}

export class LegendaryService extends GameStoreService {
  get storeName(): Game["store"] {
    return "epic";
  }

  async listGames(): Promise<Game[]> {
    // Get all owned games
    const listResult = await this.sidecar.runLegendary(["list", "--json"]);

    if (listResult.code !== 0) {
      console.error("❌ Legendary list failed:", listResult.stderr);
      throw new Error(`Legendary list failed: ${listResult.stderr}`);
    }

    let rawGames: LegendaryGame[];
    try {
      rawGames = JSON.parse(listResult.stdout);
    } catch {
      console.error("❌ Failed to parse Legendary output");
      throw new Error("Failed to parse Legendary output");
    }

    // Get installed games for more details
    const installedResult = await this.sidecar.runLegendary(["list-installed", "--json"]);
    const installedGames: Record<string, LegendaryGame> = {};

    if (installedResult.code === 0) {
      try {
        const installed: LegendaryGame[] = JSON.parse(installedResult.stdout);
        for (const game of installed) {
          installedGames[game.app_name] = game;
        }
      } catch {
        console.warn("⚠️ Could not parse installed games");
      }
    }

    const now = new Date().toISOString();

    // Map to Game interface
    const games: Game[] = rawGames.map((g) => {
      const installed = installedGames[g.app_name];
      const isInstalled = Boolean(installed);

      return {
        id: `epic-${g.app_name}`,
        storeId: g.app_name,
        store: "epic" as const,
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
      `✅ Legendary: found ${games.length} games (${Object.keys(installedGames).length} installed)`,
    );
    return games;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const result = await this.sidecar.runLegendary(["status", "--json"]);
    if (result.code !== 0) return false;

    try {
      const status = JSON.parse(result.stdout);
      return Boolean(status.account);
    } catch {
      return false;
    }
  }

  /**
   * Get authentication URL for Epic Games
   */
  async getAuthUrl(): Promise<string> {
    const result = await this.sidecar.runLegendary(["auth", "--sid"]);
    if (result.code !== 0) {
      throw new Error(`Failed to get auth URL: ${result.stderr}`);
    }

    // Extract URL from output
    const match = result.stdout.match(/https:\/\/[^\s]+/);
    if (!match) {
      throw new Error("Could not find auth URL in output");
    }

    return match[0];
  }

  /**
   * Complete authentication with authorization code
   */
  async authenticate(code: string): Promise<void> {
    const result = await this.sidecar.runLegendary(["auth", "--code", code]);
    if (result.code !== 0) {
      throw new Error(`Authentication failed: ${result.stderr}`);
    }
  }

  /**
   * Logout from Epic Games
   */
  async logout(): Promise<void> {
    const result = await this.sidecar.runLegendary(["auth", "--delete"]);
    if (result.code !== 0) {
      throw new Error(`Logout failed: ${result.stderr}`);
    }
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }
}
