/**
 * HeroicImportService - Merge installation data from Heroic Games Launcher
 *
 * Heroic is a launcher (like Pixxiden), not a store. It uses the same
 * CLI tools under the hood (gogdl, legendary). This service reads Heroic's
 * local config files to discover installed games and updates the install_path
 * of matching games already in Pixxiden's database.
 *
 * No new store type — just a post-sync merge of installation info.
 *
 * Supported paths:
 *   Native:  ~/.config/heroic/
 *   Flatpak: ~/.var/app/com.heroicgameslauncher.hgl/config/heroic/
 */

import { debug, info, warn } from "@tauri-apps/plugin-log";
import { homeDir } from "@tauri-apps/api/path";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { GameRepository } from "@/lib/database";

/** Entry from gog_store/installed.json → installed[] array */
export interface HeroicGogInstalledEntry {
  platform: string;
  executable: string;
  install_path: string;
  install_size: string;
  is_dlc: boolean;
  appName: string;
  language: string;
  version?: string;
}

/** Wrapper for gog_store/installed.json */
interface HeroicGogInstalledFile {
  installed: HeroicGogInstalledEntry[];
}

/** Per-game wine/proton config from GamesConfig/{storeId}.json */
export interface HeroicGameConfig {
  winePrefix: string;
  wineBin: string;
  wineName: string;
  wineType: string; // "proton" | "wine" | etc.
  /** Windows executable path configured in Heroic (e.g. /path/to/game.exe) */
  targetExe: string;
}

/** Resolved installation info for a game, keyed by Pixxiden game ID */
export interface HeroicInstallInfo {
  gameId: string;
  storeId: string;
  store: "gog" | "epic";
  installPath: string;
  installSize: string;
  platform: string;
  /** Wine/Proton prefix path from Heroic config (e.g. ~/Games/Heroic/Prefixes/default/GameName) */
  winePrefix: string;
  /** Wine/Proton version name (e.g. "proton-cachyos") */
  wineVersion: string;
  /** Runner type: "proton" or "wine" */
  runner: string;
  /** Absolute path to the proton/wine binary (e.g. /usr/share/steam/compatibilitytools.d/proton-cachyos/proton) */
  wineBin: string;
  /** Windows executable path for umu-run direct launch (e.g. /path/to/game.exe) */
  targetExe: string;
}

export class HeroicImportService {
  private static instance: HeroicImportService | null = null;
  private homeDirCache: string | null = null;
  private heroicConfigDirCache: string | null = null;

  static getInstance(): HeroicImportService {
    if (!HeroicImportService.instance) {
      HeroicImportService.instance = new HeroicImportService();
    }
    return HeroicImportService.instance;
  }

  /**
   * Scan Heroic's config files and return installation info
   * for games that match Pixxiden's ID format.
   *
   * Returns a list of install info that can be used to update
   * the install_path of existing games in the DB.
   */
  async getInstalledGames(): Promise<HeroicInstallInfo[]> {
    const configDir = await this.findHeroicConfigDir();
    if (!configDir) {
      await debug("[Heroic] No Heroic config directory found, skipping import");
      return [];
    }
    await debug(`[Heroic] Using config dir: ${configDir}`);

    const results: HeroicInstallInfo[] = [];

    // GOG games
    const gogGames = await this.readGogInstalled(configDir);
    for (const entry of gogGames) {
      if (entry.is_dlc) continue;

      // Read per-game wine/proton config from GamesConfig/{storeId}.json
      const gameConfig = await this.readGameConfig(configDir, entry.appName);
      await debug(
        `[Heroic] Game ${entry.appName}: config=${gameConfig ? JSON.stringify(gameConfig) : "null"}`,
      );

      results.push({
        gameId: `gog-${entry.appName}`,
        storeId: entry.appName,
        store: "gog",
        installPath: entry.install_path,
        installSize: entry.install_size || "",
        platform: entry.platform?.toLowerCase() || "windows",
        winePrefix: gameConfig?.winePrefix || "",
        wineVersion: gameConfig?.wineName || "",
        runner: gameConfig?.wineType || "",
        wineBin: gameConfig?.wineBin || "",
        targetExe: gameConfig?.targetExe || "",
      });
    }

    if (results.length > 0) {
      await info(`[Heroic] Found ${results.length} installed games`);
    }

    return results;
  }

  /**
   * Check if Heroic config directory exists
   */
  async isAvailable(): Promise<boolean> {
    return (await this.findHeroicConfigDir()) !== null;
  }

  /**
   * Merge installation data from Heroic into existing games in database.
   * Returns the number of games that were updated.
   *
   * This method handles the database update logic that was previously in GameSyncService.
   */
  async mergeInstallations(): Promise<number> {
    const heroicGames = await this.getInstalledGames();
    if (heroicGames.length === 0) {
      return 0;
    }

    const gameRepo = GameRepository.getInstance();
    let merged = 0;

    for (const heroicGame of heroicGames) {
      const existing = await gameRepo.getGameById(heroicGame.gameId);
      if (existing) {
        await gameRepo.updateInstallation(heroicGame.gameId, {
          installed: true,
          installPath: heroicGame.installPath,
          installSize: heroicGame.installSize,
          winePrefix: heroicGame.winePrefix,
          wineVersion: heroicGame.wineVersion,
          runner: heroicGame.runner,
          runnerPath: heroicGame.wineBin,
          executablePath: heroicGame.targetExe,
        });
        merged++;
        await debug(
          `[Heroic] Merged ${existing.info.title}: prefix=${heroicGame.winePrefix || "(none)"}, runner=${heroicGame.runner || "(none)"}`,
        );
      }
    }

    if (merged > 0) {
      await info(`[Heroic] Merged installation data for ${merged} games`);
    }

    return merged;
  }

  // ===== Private helpers =====

  private async getHomeDir(): Promise<string> {
    if (!this.homeDirCache) {
      this.homeDirCache = await homeDir();
    }
    return this.homeDirCache;
  }

  /**
   * Find the Heroic config directory (native or Flatpak)
   */
  private async findHeroicConfigDir(): Promise<string | null> {
    if (this.heroicConfigDirCache) return this.heroicConfigDirCache;

    const home = await this.getHomeDir();
    const candidates = [
      `${home}/.config/heroic`,
      `${home}/.var/app/com.heroicgameslauncher.hgl/config/heroic`,
    ];
    for (const dir of candidates) {
      const gogInstalledPath = `${dir}/gog_store/installed.json`;
      try {
        if (await exists(gogInstalledPath)) {
          this.heroicConfigDirCache = dir;
          await info(`[Heroic] Found config at ${dir}`);
          return dir;
        }
      } catch {
        console.error(`[Heroic] Error checking path ${gogInstalledPath}`);
        // Path not accessible
      }
    }
    return null;
  }

  private async readGogInstalled(configDir: string): Promise<HeroicGogInstalledEntry[]> {
    const filePath = `${configDir}/gog_store/installed.json`;
    try {
      const content = await readTextFile(filePath);
      const data = JSON.parse(content) as HeroicGogInstalledFile;
      return data.installed || [];
    } catch (err) {
      await warn(`[Heroic] Failed to read GOG installed.json: ${err}`);
      return [];
    }
  }

  /**
   * Read per-game wine/proton config from Heroic's GamesConfig/{storeId}.json
   *
   * Structure:
   * {
   *   "{storeId}": {
   *     "wineVersion": { "bin": "/path/to/proton", "name": "proton-cachyos", "type": "proton" },
   *     "winePrefix": "/home/user/Games/Heroic/Prefixes/default/GameName"
   *   },
   *   "version": "v0"
   * }
   */
  private async readGameConfig(
    configDir: string,
    storeId: string,
  ): Promise<HeroicGameConfig | null> {
    const filePath = `${configDir}/GamesConfig/${storeId}.json`;
    try {
      if (!(await exists(filePath))) return null;

      const content = await readTextFile(filePath);
      const data = JSON.parse(content);
      const gameSection = data[storeId];
      if (!gameSection) return null;

      const wineVersion = gameSection.wineVersion;
      return {
        winePrefix: gameSection.winePrefix || "",
        wineBin: wineVersion?.bin || "",
        wineName: wineVersion?.name || "",
        wineType: wineVersion?.type || "",
        targetExe: gameSection.targetExe || "",
      };
    } catch (err) {
      await warn(`[Heroic] Failed to read GamesConfig for ${storeId}: ${err}`);
      return null;
    }
  }
}
