/**
 * NileInstallation - Amazon Games installation via nile CLI
 */

import { GameInstallationService, type InstallOptions } from "./GameInstallationService";
import type { StoreType } from "@/types";

export class NileInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "amazon";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    const args = ["install", storeId];

    if (options.installPath) {
      args.push("--path", options.installPath);
    }

    const result = await this.sidecar.runNile(args);

    if (result.code !== 0) {
      throw new Error(`Failed to install Amazon game: ${result.stderr}`);
    }

    // Parse output for progress
    if (result.stdout.includes("%")) {
      const progressMatch = result.stdout.match(/(\d+)%/);
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
    const result = await this.sidecar.runNile(["uninstall", storeId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Amazon game: ${result.stderr}`);
    }

    await this.markAsUninstalled(gameId);
  }
}
