/**
 * GogdlInstallation - GOG installation via gogdl CLI
 */

import { GameInstallationService, type InstallOptions } from "./GameInstallationService";
import type { StoreType } from "@/types";
import { appConfigDir, join, homeDir } from "@tauri-apps/api/path";

export class GogdlInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "gog";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    // gogdl download requires: --auth-config-path (before subcommand), --platform, --path
    // gogdl auto-appends the game's folder_name to --path, so pass the parent directory.
    const authPath = await this.getAuthConfigPath();
    const installDir = options.installPath || (await this.getDefaultInstallPath());
    const platform = options.platform || "linux";

    const args = [
      "--auth-config-path",
      authPath,
      "download",
      storeId,
      "--platform",
      platform,
      "--path",
      installDir,
    ];

    if (options.language) {
      args.push("--lang", options.language);
    }

    const result = await this.sidecar.runGogdl(args);

    if (result.code !== 0) {
      throw new Error(`Failed to download GOG game: ${result.stderr}`);
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
    await this.markAsInstalled(gameId, installDir);
  }

  async uninstall(gameId: string, _storeId: string): Promise<void> {
    // gogdl doesn't have a dedicated uninstall command
    // Game files can be deleted directly from the install path
    // For now, just update the DB status
    await this.markAsUninstalled(gameId);
  }

  /**
   * Get the gogdl auth config path.
   * Mirrors GogdlService.getAuthConfigPath().
   */
  private async getAuthConfigPath(): Promise<string> {
    try {
      const configDir = await appConfigDir();
      return await join(configDir, "gog_auth.json");
    } catch {
      return "~/.config/pixxiden/gog_auth.json";
    }
  }

  /**
   * Get a default install path when none is specified.
   */
  private async getDefaultInstallPath(): Promise<string> {
    try {
      const home = await homeDir();
      return await join(home, "Games", "GOG");
    } catch {
      return "~/Games/GOG";
    }
  }
}
