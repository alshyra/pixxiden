/**
 * GameInstallationService - Abstract base class for installation services
 *
 * All store installation services extend this class.
 * It provides a unified interface for:
 * - Game installation
 * - Game uninstallation
 * - Progress tracking
 *
 * Subclasses MUST implement: install, uninstall, storeName
 */

import type { StoreType } from "@/types";
import { SidecarService } from "../base/SidecarService";
import { DatabaseService } from "../base/DatabaseService";
import type { Child } from "@tauri-apps/plugin-shell";

export interface InstallOptions {
  installPath?: string;
  platform?: "windows" | "linux" | "osx";
  language?: string;
  onProgress?: (progress: InstallProgress) => void;
}

export interface InstallProgress {
  gameId: string;
  status: "queued" | "downloading" | "installing" | "completed" | "error";
  progress: number; // 0-100, or -1 to keep current value unchanged
  downloadSpeed?: number; // MB/s
  downloadedSize?: string; // e.g. "2.00 GiB"
  totalSize?: string; // e.g. "13.12 GiB"
  eta?: number; // seconds
  error?: string;
  outputLine?: string; // latest raw CLI output line for display
}

export interface GameSizeInfo {
  diskSize: string; // e.g. "20.06 GiB"
  downloadSize: string; // e.g. "13.00 GiB"
}

export abstract class GameInstallationService {
  /** Active child processes for cancellation support */
  protected activeChildren = new Map<string, Child>();

  constructor(
    protected sidecar: SidecarService,
    protected db: DatabaseService,
  ) {}

  /**
   * Install a game - must be implemented by subclasses
   * @param gameId - The Pixxiden game ID (e.g., "epic-12345", "gog-67890")
   * @param storeId - The raw store ID without prefix (e.g., "12345", "67890")
   * @param options - Installation options (path, platform, callbacks)
   */
  abstract install(gameId: string, storeId: string, options: InstallOptions): Promise<void>;

  /**
   * Uninstall a game - must be implemented by subclasses
   * @param gameId - The Pixxiden game ID
   * @param storeId - The raw store ID without prefix
   */
  abstract uninstall(gameId: string, storeId: string): Promise<void>;

  /**
   * Get the store identifier
   */
  abstract get storeName(): StoreType;

  /**
   * Update database after successful installation
   */
  protected async markAsInstalled(gameId: string, installPath: string, platform = ""): Promise<void> {
    if (platform) {
      await this.db.execute(
        `UPDATE games SET installed = 1, install_path = ?, installed_platform = ? WHERE id = ?`,
        [installPath, platform, gameId],
      );
    } else {
      await this.db.execute(`UPDATE games SET installed = 1, install_path = ? WHERE id = ?`, [
        installPath,
        gameId,
      ]);
    }
  }

  /**
   * Update database after successful uninstallation
   */
  protected async markAsUninstalled(gameId: string): Promise<void> {
    await this.db.execute(`UPDATE games SET installed = 0, install_path = NULL WHERE id = ?`, [
      gameId,
    ]);
  }

  /**
   * Cancel an active installation by killing the child process
   */
  async cancel(gameId: string): Promise<void> {
    const child = this.activeChildren.get(gameId);
    if (child) {
      await child.kill();
      this.activeChildren.delete(gameId);
    }
  }

  /**
   * Check if this service has an active install for a given game
   */
  hasActiveInstall(gameId: string): boolean {
    return this.activeChildren.has(gameId);
  }

  /**
   * Get game size info (disk + download). Override in subclasses that support it.
   */
  async getGameInfo(_storeId: string): Promise<GameSizeInfo | null> {
    return null;
  }
}
