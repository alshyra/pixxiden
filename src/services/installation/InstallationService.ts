/**
 * InstallationService - Handles game installation and uninstallation
 * Coordinates between different store services and emits progress events
 */

import type { StoreType, Game } from "@/types";
import { SidecarService } from "../base/SidecarService";
import { DatabaseService } from "../base/DatabaseService";

export interface InstallProgress {
  gameId: string;
  status: "queued" | "downloading" | "installing" | "completed" | "error";
  progress: number; // 0-100
  downloadSpeed?: number; // MB/s
  eta?: number; // seconds
  error?: string;
}

export class InstallationService {
  private activeInstalls = new Map<string, AbortController>();

  constructor(
    private sidecar: SidecarService,
    private db: DatabaseService,
  ) {}

  /**
   * Install a game from a specific store
   */
  async installGame(
    gameId: string,
    store: StoreType,
    options: {
      installPath?: string;
      onProgress?: (progress: InstallProgress) => void;
    } = {},
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeInstalls.set(gameId, abortController);

    try {
      // Emit initial status
      options.onProgress?.({
        gameId,
        status: "queued",
        progress: 0,
      });

      // Route to appropriate store service
      switch (store) {
        case "epic":
          await this.installEpicGame(gameId, options);
          break;
        case "gog":
          await this.installGogGame(gameId, options);
          break;
        case "amazon":
          await this.installAmazonGame(gameId, options);
          break;
        case "steam":
          await this.installSteamGame(gameId, options);
          break;
        default:
          throw new Error(`Unsupported store: ${store}`);
      }

      // Update database
      await this.db.execute(`UPDATE games SET installed = 1, install_path = ? WHERE id = ?`, [
        options.installPath || "",
        gameId,
      ]);

      // Emit completion
      options.onProgress?.({
        gameId,
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      options.onProgress?.({
        gameId,
        status: "error",
        progress: 0,
        error: errorMsg,
      });
      throw error;
    } finally {
      this.activeInstalls.delete(gameId);
    }
  }

  /**
   * Uninstall a game
   */
  async uninstallGame(
    gameId: string,
    store: StoreType,
    options: {
      onProgress?: (progress: InstallProgress) => void;
    } = {},
  ): Promise<void> {
    try {
      options.onProgress?.({
        gameId,
        status: "queued",
        progress: 0,
      });

      // Route to appropriate store service
      switch (store) {
        case "epic":
          await this.uninstallEpicGame(gameId);
          break;
        case "gog":
          await this.uninstallGogGame(gameId);
          break;
        case "amazon":
          await this.uninstallAmazonGame(gameId);
          break;
        case "steam":
          await this.uninstallSteamGame(gameId);
          break;
        default:
          throw new Error(`Unsupported store: ${store}`);
      }

      // Update database
      await this.db.execute(`UPDATE games SET installed = 0, install_path = NULL WHERE id = ?`, [
        gameId,
      ]);

      options.onProgress?.({
        gameId,
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      options.onProgress?.({
        gameId,
        status: "error",
        progress: 0,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Cancel an ongoing installation
   */
  async cancelInstallation(gameId: string): Promise<void> {
    const controller = this.activeInstalls.get(gameId);
    if (controller) {
      controller.abort();
      this.activeInstalls.delete(gameId);
    }
  }

  /**
   * Check if a game is currently being installed
   */
  isInstalling(gameId: string): boolean {
    return this.activeInstalls.has(gameId);
  }

  /**
   * Get all active installations
   */
  getActiveInstallations(): string[] {
    return Array.from(this.activeInstalls.keys());
  }

  // ===== Store-specific implementations =====

  private async installEpicGame(
    gameId: string,
    options: { installPath?: string; onProgress?: (progress: InstallProgress) => void },
  ): Promise<void> {
    const args = ["install", gameId];

    if (options.installPath) {
      args.push("--base-path", options.installPath);
    }

    const result = await this.sidecar.runLegendary(args, {
      onProgress: (line) => {
        // Parse legendary output for progress
        const progressMatch = line.match(/Progress: (\d+)%/);
        if (progressMatch) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: parseInt(progressMatch[1]),
          });
        }

        const speedMatch = line.match(/Download: ([\d.]+) MiB\/s/);
        if (speedMatch) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: 0,
            downloadSpeed: parseFloat(speedMatch[1]),
          });
        }
      },
    });

    if (result.code !== 0) {
      throw new Error(`Failed to install Epic game: ${result.stderr}`);
    }
  }

  private async uninstallEpicGame(gameId: string): Promise<void> {
    const result = await this.sidecar.runLegendary(["uninstall", gameId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Epic game: ${result.stderr}`);
    }
  }

  private async installGogGame(
    gameId: string,
    options: { installPath?: string; onProgress?: (progress: InstallProgress) => void },
  ): Promise<void> {
    const args = ["install", gameId];

    if (options.installPath) {
      args.push("--path", options.installPath);
    }

    const result = await this.sidecar.runGogdl(args, {
      onProgress: (line) => {
        // Parse gogdl output for progress
        const progressMatch = line.match(/(\d+)%/);
        if (progressMatch) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: parseInt(progressMatch[1]),
          });
        }
      },
    });

    if (result.code !== 0) {
      throw new Error(`Failed to install GOG game: ${result.stderr}`);
    }
  }

  private async uninstallGogGame(gameId: string): Promise<void> {
    const result = await this.sidecar.runGogdl(["uninstall", gameId]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall GOG game: ${result.stderr}`);
    }
  }

  private async installAmazonGame(
    gameId: string,
    options: { installPath?: string; onProgress?: (progress: InstallProgress) => void },
  ): Promise<void> {
    const args = ["install", gameId];

    if (options.installPath) {
      args.push("--path", options.installPath);
    }

    const result = await this.sidecar.runNile(args, {
      onProgress: (line) => {
        // Parse nile output for progress
        const progressMatch = line.match(/(\d+)%/);
        if (progressMatch) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: parseInt(progressMatch[1]),
          });
        }
      },
    });

    if (result.code !== 0) {
      throw new Error(`Failed to install Amazon game: ${result.stderr}`);
    }
  }

  private async uninstallAmazonGame(gameId: string): Promise<void> {
    const result = await this.sidecar.runNile(["uninstall", gameId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Amazon game: ${result.stderr}`);
    }
  }

  private async installSteamGame(
    gameId: string,
    options: { installPath?: string; onProgress?: (progress: InstallProgress) => void },
  ): Promise<void> {
    // Steam games are installed through Steam client
    // We just need to trigger the steam:// protocol
    const appId = gameId.replace("steam-", "");

    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 50,
    });

    // Open steam installation link
    const result = await this.sidecar.runCommand("xdg-open", [`steam://install/${appId}`]);

    if (result.code !== 0) {
      throw new Error(`Failed to trigger Steam installation: ${result.stderr}`);
    }

    // Note: Steam handles the actual download, we can't track progress
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 100,
    });
  }

  private async uninstallSteamGame(gameId: string): Promise<void> {
    // Steam games are uninstalled through Steam client
    const appId = gameId.replace("steam-", "");

    const result = await this.sidecar.runCommand("xdg-open", [`steam://uninstall/${appId}`]);

    if (result.code !== 0) {
      throw new Error(`Failed to trigger Steam uninstallation: ${result.stderr}`);
    }
  }
}
