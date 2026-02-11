/**
 * UmuLauncherService - Wraps umu-run for proper Steam Input support
 *
 * umu-run is a unified launcher for Windows games that provides:
 * - Steam Runtime container (same as native Steam games)
 * - Proper Steam Input configuration for controller support
 * - Automatic Proton download and management
 * - protonfixes database integration
 *
 * This service detects if umu-run is available and provides the correct
 * launch command structure for games using Proton.
 *
 * @see https://github.com/Open-Wine-Components/umu-launcher
 */

import { info } from "@tauri-apps/plugin-log";

export interface UmuLaunchConfig {
  /** Wine prefix path */
  winePrefix: string;
  /** Proton installation path (or "GE-Proton" for auto-download) */
  protonPath: string;
  /** Store type (epic, gog, steam, etc.) */
  store: string;
  /** Store-specific game ID */
  storeId: string;
  /** Windows executable path (.exe) for direct umu-run launch */
  executablePath: string;
}

export class UmuLauncherService {
  private static instance: UmuLauncherService | null = null;
  private umuAvailable: boolean | null = null;

  private constructor() {}

  static getInstance(): UmuLauncherService {
    if (!UmuLauncherService.instance) {
      UmuLauncherService.instance = new UmuLauncherService();
    }
    return UmuLauncherService.instance;
  }

  /**
   * Check if umu-run is installed on the system
   * 
   * Note: Due to Tauri security restrictions, we can't reliably check if umu-run
   * exists from the frontend. Instead, we assume it's available and let the actual
   * launch command fail gracefully if it's not.
   */
  async isAvailable(): Promise<boolean> {
    if (this.umuAvailable !== null) {
      await info(`[UMU] Using cached availability: ${this.umuAvailable}`);
      return this.umuAvailable;
    }

    // Assume umu-run is available at /usr/bin/umu-run
    // We'll let the actual spawn fail and fallback if needed
    await info("[UMU] Assuming umu-run is available at /usr/bin/umu-run");
    this.umuAvailable = true;
    return true;
  }

  /**
   * Generate GAMEID for umu-run based on store and game ID
   * Format: umu-{store}-{storeId}
   */
  generateGameId(store: string, storeId: string): string {
    return `umu-${store}-${storeId}`;
  }

  /**
   * Generate store identifier for umu-run
   * Maps Pixxiden store names to umu STORE values
   */
  mapStoreToUmu(store: string): string {
    const storeMap: Record<string, string> = {
      epic: "egs",
      gog: "gog",
      amazon: "amazon",
      steam: "steam",
    };
    return storeMap[store] || store;
  }

  /**
   * Build environment variables for umu-run
   */
  buildUmuEnv(config: UmuLaunchConfig): Record<string, string> {
    // umu-run expects PROTONPATH to be the directory containing toolmanifest.vdf,
    // not the proton binary itself. Remove "/proton" suffix if present.
    let protonDir = config.protonPath;
    if (protonDir.endsWith("/proton")) {
      protonDir = protonDir.slice(0, -7); // Remove "/proton"
    }

    return {
      WINEPREFIX: config.winePrefix,
      GAMEID: this.generateGameId(config.store, config.storeId),
      STORE: this.mapStoreToUmu(config.store),
      PROTONPATH: protonDir,
    };
  }

  /**
   * Build umu-run command array for direct .exe launch
   *
   * @param config - UMU launch configuration (must include executablePath)
   * @returns Command array: ["umu-run-wrapper", "/path/to/game.exe"]
   */
  buildUmuCommand(config: UmuLaunchConfig): string[] {
    return ["umu-run-wrapper", config.executablePath];
  }

  /**
   * Build a direct umu-run launch command from game configuration.
   *
   * Unlike the old approach that tried to wrap CLI tools (gogdl, legendary),
   * umu-run only works with Windows .exe files. This method builds:
   *   ["umu-run-wrapper", "/path/to/game.exe"]
   * with the proper environment variables (GAMEID, STORE, PROTONPATH, WINEPREFIX).
   *
   * @param config - UMU configuration including the .exe path
   * @returns Tuple of [command array, environment variables]
   */
  buildDirectLaunch(
    config: UmuLaunchConfig,
  ): [string[], Record<string, string>] {
    const umuCommand = this.buildUmuCommand(config);
    const umuEnv = this.buildUmuEnv(config);

    info(
      `[UMU] Direct launch: ${umuCommand.join(" ")} with env GAMEID=${umuEnv.GAMEID} STORE=${umuEnv.STORE} PROTONPATH=${umuEnv.PROTONPATH}`,
    );

    return [umuCommand, umuEnv];
  }

  /**
   * @deprecated Use buildDirectLaunch() instead. umu-run cannot wrap CLI tools.
   */
  transformToUmuCommand(
    _originalCommand: string[],
    config: UmuLaunchConfig,
  ): [string[], Record<string, string>] {
    return this.buildDirectLaunch(config);
  }
}
