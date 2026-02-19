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
   * Décision de lancement (priorité décroissante) :
   * 1. umu-run  : non-steam + umuId connu + executablePath présent
   *              → UmuLauncherService.buildDirectLaunch, pas de ProtonService
   * 2. Fallback : stratégie par store (legendary/gogdl/nile/steam)
   *              → ProtonService + LaunchStrategy
   */
  async prepareLaunch(gameId: string): Promise<PreparedLaunch> {
    const game = await this.gameRepo.getGameById(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // --- Voie umu-run ---
    if (
      game.storeData.store !== "steam" &&
      game.storeData.umuId &&
      game.installation.executablePath
    ) {
      const [launchCommand, env] = this.umuLauncher.buildDirectLaunch({
        winePrefix: game.installation.winePrefix,
        store: game.storeData.store,
        umuId: game.storeData.umuId,
        executablePath: game.installation.executablePath,
      });

      await info(
        `[LaunchBuilder] umu-run path for ${game.info.title} (GAMEID=${game.storeData.umuId})`,
      );

      return { game, launchCommand, env };
    }

    // --- Voie fallback : stratégie par store ---
    await info(
      `[LaunchBuilder] Fallback to store strategy for ${game.info.title} (no umuId or exe)`,
    );

    const protonService = ProtonService.getInstance();
    const protonConfig = await protonService.ensureProtonInstalled();

    if (protonConfig && (game.storeData.store === "epic" || game.storeData.store === "gog")) {
      const prereqs = await protonService.checkSystemPrerequisites();
      if (!prereqs.ok) {
        throw new Error(prereqs.instructions);
      }
    }

    const context = await this.buildLaunchContext(game, protonConfig);

    const strategy = this.strategies[game.storeData.store];
    if (!strategy) {
      throw new Error(`No launch strategy for store: ${game.storeData.store}`);
    }

    const launchCommand = await strategy.buildCommand(game, context);
    const env = await strategy.buildEnv(game, context);

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
}

