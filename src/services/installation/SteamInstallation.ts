/**
 * SteamInstallation - Steam installation via steam:// protocol
 */

import { GameInstallationService, type InstallOptions } from "./GameInstallationService";
import type { StoreType } from "@/types";

export class SteamInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "steam";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 50,
    });

    // Open steam installation link (using xdg-open)
    const result = await this.sidecar.runCommand("xdg-open", [`steam://install/${storeId}`]);

    if (result.code !== 0) {
      throw new Error(`Failed to trigger Steam installation: ${result.stderr}`);
    }

    // Note: Steam handles the actual download, we can't track progress
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 100,
    });

    // Don't mark as installed immediately — Steam will handle that
  }

  async uninstall(gameId: string, storeId: string): Promise<void> {
    const result = await this.sidecar.runCommand("xdg-open", [`steam://uninstall/${storeId}`]);

    if (result.code !== 0) {
      throw new Error(`Failed to trigger Steam uninstallation: ${result.stderr}`);
    }

    // Don't mark as uninstalled immediately — Steam will handle that
  }
}
