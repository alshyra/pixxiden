/**
 * Steam Local Library Reader
 * Reads installed games from Steam's local filesystem
 */

import { readTextFile, readDir, exists } from "@tauri-apps/plugin-fs";
import { homeDir, join } from "@tauri-apps/api/path";
import { warn, info } from "@tauri-apps/plugin-log";
import type { Game } from "@/types";
import { createGame } from "@/types";
import {
  parseLibraryFoldersVdf,
  parseAppManifestAcf,
  type SteamLibraryFolder,
  type SteamAppManifest,
} from "./SteamParser";

export interface SteamInstalledGame {
  appId: string;
  name: string;
  installPath: string;
  installDir: string;
  sizeOnDisk: string;
  libraryPath: string;
}

export class SteamLocalLibrary {
  private static readonly STEAM_PATHS = [
    ".local/share/Steam", // Standard Linux location
    ".steam/steam", // Symlink location
  ];

  /**
   * Find Steam installation directory
   */
  private static async findSteamDir(): Promise<string | null> {
    const home = await homeDir();

    for (const steamPath of this.STEAM_PATHS) {
      const fullPath = await join(home, steamPath);
      const steamExists = await exists(fullPath);

      if (steamExists) {
        await info(`Found Steam installation at: ${fullPath}`);
        return fullPath;
      }
    }

    await warn("Steam installation not found");
    return null;
  }

  /**
   * Read library folders from libraryfolders.vdf
   */
  private static async readLibraryFolders(steamDir: string): Promise<SteamLibraryFolder[]> {
    try {
      const libraryFoldersPath = await join(steamDir, "steamapps", "libraryfolders.vdf");
      const libraryFoldersExists = await exists(libraryFoldersPath);

      if (!libraryFoldersExists) {
        await warn(`libraryfolders.vdf not found at: ${libraryFoldersPath}`);
        return [];
      }

      const content = await readTextFile(libraryFoldersPath);
      const folders = parseLibraryFoldersVdf(content);

      await info(`Found ${folders.length} Steam library folders`);
      return folders;
    } catch (error) {
      await warn(`Failed to read library folders: ${error}`);
      return [];
    }
  }

  /**
   * Read app manifest files from a library folder
   */
  private static async readAppManifests(
    libraryPath: string,
  ): Promise<{ manifest: SteamAppManifest; libraryPath: string }[]> {
    try {
      const steamappsPath = await join(libraryPath, "steamapps");
      const dirExists = await exists(steamappsPath);

      if (!dirExists) {
        await warn(`steamapps directory not found at: ${steamappsPath}`);
        return [];
      }

      const entries = await readDir(steamappsPath);
      const manifests: { manifest: SteamAppManifest; libraryPath: string }[] = [];

      for (const entry of entries) {
        // Look for appmanifest_*.acf files
        if (entry.name && entry.name.startsWith("appmanifest_") && entry.name.endsWith(".acf")) {
          try {
            const manifestPath = await join(steamappsPath, entry.name);
            const content = await readTextFile(manifestPath);
            const manifest = parseAppManifestAcf(content);

            if (manifest) {
              manifests.push({ manifest, libraryPath });
            }
          } catch (error) {
            await warn(`Failed to read manifest ${entry.name}: ${error}`);
          }
        }
      }

      await info(`Found ${manifests.length} app manifests in ${libraryPath}`);
      return manifests;
    } catch (error) {
      await warn(`Failed to read app manifests from ${libraryPath}: ${error}`);
      return [];
    }
  }

  /**
   * Convert Steam manifest to Game object
   */
  private static async manifestToGame(
    manifest: SteamAppManifest,
    libraryPath: string,
  ): Promise<Game> {
    const installPath = await join(libraryPath, "steamapps", "common", manifest.installdir);

    return createGame({
      id: `steam_${manifest.appid}`,
      store: "steam",
      storeId: manifest.appid,
      title: manifest.name,
      installed: true,
      installPath,
      installSize: manifest.SizeOnDisk || "0",
    });
  }

  /**
   * Get all installed Steam games
   */
  static async getInstalledGames(): Promise<Game[]> {
    try {
      await info("Reading Steam local library...");

      // Find Steam installation
      const steamDir = await this.findSteamDir();
      if (!steamDir) {
        return [];
      }

      // Read library folders
      const libraryFolders = await this.readLibraryFolders(steamDir);
      if (libraryFolders.length === 0) {
        await warn("No Steam library folders found");
        return [];
      }

      // Read app manifests from all library folders
      const allManifests: { manifest: SteamAppManifest; libraryPath: string }[] = [];

      for (const folder of libraryFolders) {
        const manifests = await this.readAppManifests(folder.path);
        allManifests.push(...manifests);
      }

      // Convert to Game objects
      const games: Game[] = [];
      for (const { manifest, libraryPath } of allManifests) {
        const game = await this.manifestToGame(manifest, libraryPath);
        games.push(game);
      }

      await info(`Found ${games.length} installed Steam games`);
      return games;
    } catch (error) {
      await warn(`Failed to read Steam local library: ${error}`);
      return [];
    }
  }
}
