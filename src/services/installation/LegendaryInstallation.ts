/**
 * LegendaryInstallation - Epic Games installation via legendary CLI
 */

import { GameInstallationService, type InstallOptions } from "./GameInstallationService";
import type { StoreType } from "@/types";

export class LegendaryInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "epic";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    const args = ["install", storeId];

    if (options.installPath) {
      args.push("--base-path", options.installPath);
    }

    const result = await this.sidecar.runLegendary(args);

    if (result.code !== 0) {
      throw new Error(`Failed to install Epic game: ${result.stderr}`);
    }

    // Parse output for progress (could emit events here if needed)
    if (result.stdout.includes("Progress")) {
      const progressMatch = result.stdout.match(/Progress: (\d+)%/);
      if (progressMatch) {
        options.onProgress?.({
          gameId,
          status: "downloading",
          progress: parseInt(progressMatch[1]),
        });
      }
    }

    // Mark as installed in database
    if (options.installPath) {
      await this.markAsInstalled(gameId, options.installPath);
    }
  }

  async uninstall(gameId: string, storeId: string): Promise<void> {
    const result = await this.sidecar.runLegendary(["uninstall", storeId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Epic game: ${result.stderr}`);
    }

    await this.markAsUninstalled(gameId);
  }
}
