/**
 * ImageCacheService - Downloads and caches game images locally
 *
 * Stores images under: ~/.config/com.Pixxiden.launcher/games/{gameId}/
 *   - hero.jpg
 *   - cover.jpg
 *   - grid.jpg
 *   - logo.png
 *   - icon.png
 *   - screenshots/0.jpg, 1.jpg, ...
 *
 * This avoids hitting external CDNs repeatedly and prevents rate limiting.
 * Uses @tauri-apps/plugin-fs for filesystem access and @tauri-apps/plugin-http for downloads.
 */

import { exists, mkdir, writeFile, remove } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";

export interface CachedImagePaths {
  heroPath?: string;
  coverPath?: string;
  gridPath?: string;
  logoPath?: string;
  iconPath?: string;
  screenshotPaths?: string[];
}

export class ImageCacheService {
  private static instance: ImageCacheService | null = null;
  private basePath: string | null = null;

  private constructor() {}

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * Get the base path for game images: ~/.config/com.Pixxiden.launcher/games/
   */
  private async getBasePath(): Promise<string> {
    if (this.basePath) return this.basePath;
    const configDir = await appConfigDir();
    this.basePath = await join(configDir, "games");
    return this.basePath;
  }

  /**
   * Get the directory for a specific game's images
   */
  private async getGameDir(gameId: string): Promise<string> {
    const base = await this.getBasePath();
    return join(base, gameId);
  }

  /**
   * Ensure a directory exists (recursive)
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      const dirExists = await exists(dirPath);
      if (!dirExists) {
        await mkdir(dirPath, { recursive: true });
      }
    } catch {
      // mkdir with recursive shouldn't fail, but just in case
      await mkdir(dirPath, { recursive: true }).catch(() => {});
    }
  }

  /**
   * Download an image from a URL and save it locally
   * Returns the local file path, or undefined if download fails
   */
  private async downloadImage(url: string, destPath: string): Promise<string | undefined> {
    try {
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        await warn(`Image download failed (${response.status}): ${url}`);
        return undefined;
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      if (data.length === 0) {
        await warn(`Empty image response: ${url}`);
        return undefined;
      }

      await writeFile(destPath, data);
      return destPath;
    } catch (err) {
      await warn(`Failed to download image ${url}: ${err}`);
      return undefined;
    }
  }

  /**
   * Get the file extension from a URL
   */
  private getExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split(".").pop()?.toLowerCase();
      if (ext && ["jpg", "jpeg", "png", "webp", "gif", "ico", "svg"].includes(ext)) {
        return ext;
      }
    } catch {
      // fallback
    }
    return "jpg"; // default
  }

  /**
   * Cache all images for a game
   * Downloads hero, cover, grid, logo, icon, and screenshots from URLs
   * Returns local file paths for each cached image
   */
  async cacheGameImages(
    gameId: string,
    urls: {
      hero?: string;
      cover?: string;
      grid?: string;
      logo?: string;
      icon?: string;
      screenshots?: string[];
    },
  ): Promise<CachedImagePaths> {
    const gameDir = await this.getGameDir(gameId);
    await this.ensureDir(gameDir);

    const result: CachedImagePaths = {};

    // Download main images in parallel
    const downloads: Promise<void>[] = [];

    if (urls.hero) {
      const ext = this.getExtension(urls.hero);
      const dest = await join(gameDir, `hero.${ext}`);
      downloads.push(
        this.downloadImage(urls.hero, dest).then((path) => {
          result.heroPath = path;
        }),
      );
    }

    if (urls.cover) {
      const ext = this.getExtension(urls.cover);
      const dest = await join(gameDir, `cover.${ext}`);
      downloads.push(
        this.downloadImage(urls.cover, dest).then((path) => {
          result.coverPath = path;
        }),
      );
    }

    if (urls.grid) {
      const ext = this.getExtension(urls.grid);
      const dest = await join(gameDir, `grid.${ext}`);
      downloads.push(
        this.downloadImage(urls.grid, dest).then((path) => {
          result.gridPath = path;
        }),
      );
    }

    if (urls.logo) {
      const ext = this.getExtension(urls.logo);
      const dest = await join(gameDir, `logo.${ext}`);
      downloads.push(
        this.downloadImage(urls.logo, dest).then((path) => {
          result.logoPath = path;
        }),
      );
    }

    if (urls.icon) {
      const ext = this.getExtension(urls.icon);
      const dest = await join(gameDir, `icon.${ext}`);
      downloads.push(
        this.downloadImage(urls.icon, dest).then((path) => {
          result.iconPath = path;
        }),
      );
    }

    // Download screenshots
    if (urls.screenshots && urls.screenshots.length > 0) {
      const screenshotsDir = await join(gameDir, "screenshots");
      await this.ensureDir(screenshotsDir);
      result.screenshotPaths = [];

      for (let i = 0; i < urls.screenshots.length; i++) {
        const url = urls.screenshots[i];
        const ext = this.getExtension(url);
        const dest = await join(screenshotsDir, `${i}.${ext}`);
        downloads.push(
          this.downloadImage(url, dest).then((path) => {
            if (path) result.screenshotPaths!.push(path);
          }),
        );
      }
    }

    await Promise.all(downloads);

    await debug(
      `Cached images for ${gameId}: ` +
        `hero=${!!result.heroPath} cover=${!!result.coverPath} ` +
        `grid=${!!result.gridPath} logo=${!!result.logoPath} ` +
        `icon=${!!result.iconPath} screenshots=${result.screenshotPaths?.length ?? 0}`,
    );

    return result;
  }

  /**
   * Check if a game already has cached images
   */
  async hasCachedImages(gameId: string): Promise<boolean> {
    try {
      const gameDir = await this.getGameDir(gameId);
      return await exists(gameDir);
    } catch {
      return false;
    }
  }

  /**
   * Delete cached images for a game
   */
  async clearGameCache(gameId: string): Promise<void> {
    try {
      const gameDir = await this.getGameDir(gameId);
      const dirExists = await exists(gameDir);
      if (dirExists) {
        await remove(gameDir, { recursive: true });
        await debug(`Cleared image cache for ${gameId}`);
      }
    } catch (err) {
      await logError(`Failed to clear image cache for ${gameId}: ${err}`);
    }
  }

  /**
   * Clear all cached images
   */
  async clearAllCache(): Promise<void> {
    try {
      const basePath = await this.getBasePath();
      const baseExists = await exists(basePath);
      if (baseExists) {
        await remove(basePath, { recursive: true });
        await debug("Cleared all image cache");
      }
    } catch (err) {
      await logError(`Failed to clear all image cache: ${err}`);
    }
  }
}
