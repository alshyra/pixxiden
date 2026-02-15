/**
 * EpicLaunchStrategy - Launch logic for Epic Games (via legendary CLI)
 *
 * Proton handling:
 * - --no-wine disables legendary's wine handling
 * - --wrapper passes `proton waitforexitandrun` as a command prefix
 * - Wine prefix is handled via STEAM_COMPAT_DATA_PATH env var
 */

import type { Game } from "@/types";
import type { LaunchContext, LaunchStrategy } from "./LaunchStrategy";

export class EpicLaunchStrategy implements LaunchStrategy {
  async buildCommand(game: Game, context: LaunchContext): Promise<string[]> {
    const args = ["legendary", "launch", game.storeData.storeId];

    if (context.protonPath) {
      // Proton requires a verb (e.g. waitforexitandrun) as first argument.
      // --no-wine disables legendary's wine handling, and --wrapper
      // passes the full `proton waitforexitandrun` as a command prefix.
      args.push(
        "--no-wine",
        "--wrapper",
        `${context.cleanEnvPrefix} ${context.protonPath} waitforexitandrun`,
      );
    }

    return args;
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
