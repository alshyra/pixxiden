/**
 * LaunchCommandBuilder - Builds launch commands using store-specific strategies
 *
 * Replaces the monolithic buildLaunchCommand/buildLaunchEnv/resolveProtonPath
 * methods that were in GameLibraryOrchestrator.
 *
 * Responsibilities:
 * - Resolve Proton binary path (Heroic config vs Pixxiden's Proton-GE)
 * - Build per-game Wine prefix directories
 * - Delegate command & env building to store-specific LaunchStrategy
 * - Apply umu-run override when available
 */

import type { Game, StoreType } from "@/types";
import { GameRepository } from "@/lib/database";
import { ProtonService, type ProtonConfig } from "@/services/runners";
import { UmuLauncherService } from "@/services/runners/UmuLauncherService";
import { mkdir } from "@tauri-apps/plugin-fs";
import { info, warn } from "@tauri-apps/plugin-log";

import type { LaunchContext, LaunchStrategy } from "./strategies/LaunchStrategy";
import { EpicLaunchStrategy } from "./strategies/EpicLaunchStrategy";
import { GogLaunchStrategy } from "./strategies/GogLaunchStrategy";
import { AmazonLaunchStrategy } from "./strategies/AmazonLaunchStrategy";
import { SteamLaunchStrategy } from "./strategies/SteamLaunchStrategy";

/**
 * PyInstaller-bundled sidecars (legendary, gogdl, nile) pollute PYTHONHOME/PYTHONPATH/
 * LD_LIBRARY_PATH. When they spawn Proton (also Python), it crashes.
 * Fix: /usr/bin/env -u unsets those vars before Proton runs.
 */
const CLEAN_ENV_PREFIX =
  "/usr/bin/env -u PYTHONHOME -u PYTHONPATH -u PYTHONDONTWRITEBYTECODE -u _MEIPASS2 -u LD_LIBRARY_PATH";

export interface PreparedLaunch {
  game: Game;
  launchCommand: string[];
  env: Record<string, string>;
}

export class LaunchCommandBuilder {
  private static instance: LaunchCommandBuilder | null = null;

  private strategies: Record<StoreType, LaunchStrategy>;
  private gameRepo: GameRepository;
  private umuLauncher: UmuLauncherService;

  private constructor() {
    this.strategies = {
      epic: new EpicLaunchStrategy(),
      gog: new GogLaunchStrategy(),
      amazon: new AmazonLaunchStrategy(),
      steam: new SteamLaunchStrategy(),
    };
    this.gameRepo = GameRepository.getInstance();
    this.umuLauncher = UmuLauncherService.getInstance();
  }

  static getInstance(): LaunchCommandBuilder {
    if (!LaunchCommandBuilder.instance) {
      LaunchCommandBuilder.instance = new LaunchCommandBuilder();
    }
    return LaunchCommandBuilder.instance;
  }

  /**
   * Prepare game launch data (command + env vars).
   *
   * 1. Ensures Proton is installed
   * 2. Checks system prerequisites (32-bit libs)
   * 3. Builds launch context (Proton paths, Wine prefix)
   * 4. Delegates to store-specific strategy
   * 5. Applies umu-run override if available
   */
  async prepareLaunch(gameId: string): Promise<PreparedLaunch> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // Ensure Proton is installed before building launch command
    const protonService = ProtonService.getInstance();
    const protonConfig = await protonService.ensureProtonInstalled();

    // Check 32-bit prerequisites for Proton-based launches (Epic, GOG)
    if (protonConfig && (game.storeData.store === "epic" || game.storeData.store === "gog")) {
      const prereqs = await protonService.checkSystemPrerequisites();
      if (!prereqs.ok) {
        throw new Error(prereqs.instructions);
      }
    }

    // Build launch context with Proton paths and Wine prefix
    const context = await this.buildLaunchContext(game, protonConfig);

    // Delegate to store-specific strategy
    const strategy = this.strategies[game.storeData.store];
    if (!strategy) {
      throw new Error(`No launch strategy for store: ${game.storeData.store}`);
    }

    let launchCommand = await strategy.buildCommand(game, context);
    let env = await strategy.buildEnv(game, context);

    // If umu-run is available with a .exe path and Proton, bypass the CLI
    // and launch directly via umu-run for Steam Runtime + Steam Input support
    const result = await this.tryUmuRunOverride(game, context, launchCommand, env);
    launchCommand = result.command;
    env = result.env;

    return { game, launchCommand, env };
  }

  // ===== Private Helpers =====

  /**
   * Build the LaunchContext with resolved Proton paths and Wine prefix dirs.
   */
  private async buildLaunchContext(
    game: Game,
    protonConfig: ProtonConfig | null,
  ): Promise<LaunchContext> {
    const protonPath = this.resolveProtonPath(game, protonConfig);
    const protonService = ProtonService.getInstance();

    let compatDataPath = "";
    let compatClientInstallPath = "";

    const needsProton =
      (game.storeData.store === "epic" || game.storeData.store === "gog") &&
      (protonConfig || (game.installation.runner === "proton" && game.installation.runnerPath));

    if (needsProton) {
      try {
        if (game.installation.winePrefix) {
          // Heroic-configured wine prefix
          compatDataPath = game.installation.winePrefix;

          const runnersDir = await protonService.getRunnersDir();
          compatClientInstallPath = `${runnersDir}/compat`;
          await mkdir(compatClientInstallPath, { recursive: true });

          await info(
            `[LaunchBuilder] Using Heroic prefix: STEAM_COMPAT_DATA_PATH=${game.installation.winePrefix}`,
          );
        } else {
          // Create our own per-game prefix directory
          const prefixesDir = await protonService.getPrefixesDir();
          compatDataPath = `${prefixesDir}/${game.storeData.store}/${game.storeData.storeId}`;
          await mkdir(compatDataPath, { recursive: true });

          const runnersDir = await protonService.getRunnersDir();
          compatClientInstallPath = `${runnersDir}/compat`;
          await mkdir(compatClientInstallPath, { recursive: true });

          await info(
            `[LaunchBuilder] Set Proton env: STEAM_COMPAT_DATA_PATH=${compatDataPath}, STEAM_COMPAT_CLIENT_INSTALL_PATH=${compatClientInstallPath}`,
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await warn(`[LaunchBuilder] Could not set Proton env vars: ${msg}`);
      }
    }

    return {
      protonPath,
      cleanEnvPrefix: CLEAN_ENV_PREFIX,
      compatDataPath,
      compatClientInstallPath,
    };
  }

  /**
   * Resolve the effective Proton binary path for a game.
   *
   * Priority:
   * 1. Heroic-configured Proton path (from GamesConfig/{storeId}.json → wineVersion.bin)
   *    — only if runner type is "proton"
   * 2. Pixxiden's own Proton-GE install path
   * 3. null (no Proton available)
   */
  private resolveProtonPath(game: Game, protonConfig: ProtonConfig | null): string | null {
    if (game.installation.runner === "proton" && game.installation.runnerPath) {
      return game.installation.runnerPath;
    }
    return protonConfig?.protonPath ?? null;
  }

  /**
   * If umu-run is available, the game has an executablePath (.exe), and we're using Proton,
   * bypass the CLI command entirely and launch the .exe directly via umu-run-wrapper.
   * This provides Steam Runtime + Steam Input for proper controller support.
   */
  private async tryUmuRunOverride(
    game: Game,
    context: LaunchContext,
    command: string[],
    env: Record<string, string>,
  ): Promise<{ command: string[]; env: Record<string, string> }> {
    const executablePath = game.installation.executablePath;

    if (!context.protonPath || !executablePath || !(await this.umuLauncher.isAvailable())) {
      return { command, env };
    }

    const winePrefix = game.installation.winePrefix || context.compatDataPath || "";

    const [umuCommand, umuEnv] = this.umuLauncher.buildDirectLaunch({
      winePrefix,
      protonPath: context.protonPath,
      store: game.storeData.store,
      storeId: game.storeData.storeId,
      executablePath,
    });

    await info(
      `[LaunchBuilder] Using umu-run for ${game.info.title}: exe=${executablePath} (GAMEID=${umuEnv.GAMEID})`,
    );

    // UMU env vars take precedence
    return {
      command: umuCommand,
      env: { ...env, ...umuEnv },
    };
  }
}
