/**
 * GogLaunchStrategy - Launch logic for GOG games (via gogdl CLI)
 *
 * gogdl requires --auth-config-path before the subcommand.
 *
 * Platform handling:
 * - Windows games (installedPlatform === 'windows'): use Proton wrapper (--no-wine + --wrapper)
 * - Linux games (installedPlatform === 'linux' or empty/legacy): launch natively (--platform linux)
 *
 * Install path resolution:
 * - gogdl download creates a subfolder: installPath/GameName/gameinfo
 * - We scan for the actual game directory if installPath is the parent (legacy data or new installs)
 */

import type { Game } from "@/types";
import { GogdlService } from "@/services/stores";
import { readDir, exists } from "@tauri-apps/plugin-fs";
import type { LaunchContext, LaunchStrategy } from "./LaunchStrategy";

export class GogLaunchStrategy implements LaunchStrategy {
  async buildCommand(game: Game, context: LaunchContext): Promise<string[]> {
    const configPath = await GogdlService.getInstance().getAuthConfigPathPublic();
    const args = ["gogdl", "--auth-config-path", configPath, "launch"];

    // Determine whether this game needs Proton.
    // - installedPlatform === 'windows' → Windows build → requires Proton
    // - 'linux', '' (unknown/legacy) → native Linux build → launch directly
    // Default to 'linux' for safety: avoids launching Linux games through a Windows Proton wrapper.
    const installedPlatform = game.installation.installedPlatform || "linux";
    const isWindowsGame = installedPlatform === "windows";

    // --platform is always required by gogdl launch
    args.push("--platform", isWindowsGame ? "windows" : "linux");

    // Proton wrapper — only for Windows games with a configured runner
    if (isWindowsGame && context.protonPath) {
      args.push(
        "--no-wine",
        "--wrapper",
        `${context.cleanEnvPrefix} ${context.protonPath} waitforexitandrun`,
      );
    }

    if (game.installation.installPath) {
      // Resolve the actual game directory:
      // gogdl installs into a subfolder (installPath/GameName/), so if installPath is the
      // parent directory we scan for the child that contains a 'gameinfo' file.
      const gamePath = await this.resolveGamePath(game.installation.installPath);
      args.push(gamePath);
    }

    args.push(game.storeData.storeId);
    return args;
  }

  /**
   * Resolve the actual GOG game installation directory.
   *
   * gogdl download creates the game in a subdirectory: `installPath/<folder_name>/`
   * A 'gameinfo' file is always present in the real game directory.
   *
   * If installPath already has a 'gameinfo' (i.e. it IS the game dir), return as-is.
   * Otherwise, scan for a direct child containing 'gameinfo'.
   * Falls back to installPath on any error.
   */
  private async resolveGamePath(installPath: string): Promise<string> {
    try {
      // Fast path: installPath is already the game directory
      if (await exists(`${installPath}/gameinfo`)) {
        return installPath;
      }
      // Slow path: scan subdirectories for the game directory
      const entries = await readDir(installPath);
      for (const entry of entries) {
        if (entry.isDirectory) {
          const candidate = `${installPath}/${entry.name}`;
          if (await exists(`${candidate}/gameinfo`)) {
            return candidate;
          }
        }
      }
    } catch {
      // FS error — fall back to the stored path
    }
    return installPath;
  }

  async buildEnv(_game: Game, context: LaunchContext): Promise<Record<string, string>> {
    const env: Record<string, string> = {};

    if (context.protonPath) {
      env.STEAM_COMPAT_DATA_PATH = context.compatDataPath;
      env.STEAM_COMPAT_CLIENT_INSTALL_PATH = context.compatClientInstallPath;
    }

    return env;
  }
}
