/**
 * GogLaunchStrategy - Launch logic for GOG games (via gogdl CLI)
 *
 * gogdl requires --auth-config-path before the subcommand.
 * Proton handling mirrors the Epic strategy (--no-wine + --wrapper).
 */

import type { Game } from "@/types";
import { GogdlService } from "@/services/stores";
import type { LaunchContext, LaunchStrategy } from "./LaunchStrategy";

export class GogLaunchStrategy implements LaunchStrategy {
  async buildCommand(game: Game, context: LaunchContext): Promise<string[]> {
    const configPath = await GogdlService.getInstance().getAuthConfigPathPublic();
    const args = ["gogdl", "--auth-config-path", configPath, "launch"];

    if (context.protonPath) {
      args.push("--platform", "windows");
      // Same Proton wrapper approach as Epic
      args.push(
        "--no-wine",
        "--wrapper",
        `${context.cleanEnvPrefix} ${context.protonPath} waitforexitandrun`,
      );
    }

    if (game.installation.installPath) {
      args.push(game.installation.installPath);
    }

    args.push(game.storeData.storeId);
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
