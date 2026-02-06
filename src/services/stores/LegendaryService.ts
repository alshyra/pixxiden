/**
 * LegendaryService - Epic Games store via legendary CLI
 */

import type { Game } from "@/types";
import { GameStoreService } from "./GameStoreService";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";

/**
 * Legendary JSON output structure (from `legendary list --json`)
 * Fields: app_name, app_title, metadata.developer, asset_infos, etc.
 */
interface LegendaryGame {
  app_name: string;
  app_title: string;
  metadata?: {
    title?: string;
    developer?: string;
    customAttributes?: Record<string, unknown>;
  };
  asset_infos?: Record<string, unknown>;
  dlcs?: unknown[];
}

export class LegendaryService extends GameStoreService {
  get storeName(): Game["store"] {
    return "epic";
  }

  async listGames(): Promise<Game[]> {
    // Get all owned games
    const listResult = await this.sidecar.runLegendary(["list", "--json"]);

    if (listResult.code !== 0) {
      await logError(`Legendary list failed: ${listResult.stderr}`);
      throw new Error(`Legendary list failed: ${listResult.stderr}`);
    }

    let rawGames: LegendaryGame[];
    try {
      rawGames = JSON.parse(listResult.stdout);
    } catch {
      await logError("Failed to parse Legendary output");
      throw new Error("Failed to parse Legendary output");
    }

    // Get installed games for more details
    const installedResult = await this.sidecar.runLegendary(["list-installed", "--json"]);
    const installedGames: Record<string, LegendaryInstalledGame> = {};

    if (installedResult.code === 0) {
      try {
        const installed: LegendaryInstalledGame[] = JSON.parse(installedResult.stdout);
        for (const game of installed) {
          installedGames[game.app_name] = game;
        }
      } catch {
        await warn("Could not parse installed games");
      }
    }

    const now = new Date().toISOString();

    // Map to Game interface — legendary uses app_title (not title)
    const games: Game[] = rawGames
      .filter((g) => g.app_title) // skip entries with no title
      .map((g) => {
        const installed = installedGames[g.app_name];
        const isInstalled = Boolean(installed);

        return {
          id: `epic-${g.app_name}`,
          storeId: g.app_name,
          store: "epic" as const,
          title: g.app_title,
          installed: isInstalled,
          installPath: installed?.install_path,
          installSize: installed?.install_size
            ? this.formatSize(installed.install_size)
            : undefined,
          executablePath: installed?.executable,
          developer: g.metadata?.developer,
          genres: [],
          playTimeMinutes: 0,
          createdAt: now,
          updatedAt: now,
        };
      });

    await debug(
      `Legendary: found ${games.length} games (${Object.keys(installedGames).length} installed)`,
    );
    return games;
  }

  /**
   * Get Epic Games authentication URL
   * Returns the URL that users should open in their browser to authenticate
   */
  getAuthUrl(): string {
    return "https://legendary.gl/epiclogin";
  }

  /**
   * Check if user is authenticated with Epic Games
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
   * Authenticate with Epic Games using authorization code
   * Code comes from Epic OAuth redirect: https://www.epicgames.com/id/api/redirect
   */
  async authenticate(authorizationCode: string): Promise<void> {
    const result = await this.sidecar.runLegendary(["auth", "--code", authorizationCode]);
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

/** Separate interface for list-installed output (different shape) */
interface LegendaryInstalledGame {
  app_name: string;
  title?: string;
  install_path?: string;
  install_size?: number;
  executable?: string;
  version?: string;
}
