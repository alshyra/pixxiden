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

export interface InstallOptions {
  installPath?: string;
  platform?: "windows" | "linux" | "osx";
  language?: string;
  onProgress?: (progress: InstallProgress) => void;
}

export interface InstallProgress {
  gameId: string;
  status: "queued" | "downloading" | "installing" | "completed" | "error";
  progress: number; // 0-100
  downloadSpeed?: number; // MB/s
  eta?: number; // seconds
  error?: string;
}

export abstract class GameInstallationService {
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
  protected async markAsInstalled(gameId: string, installPath: string): Promise<void> {
    await this.db.execute(`UPDATE games SET installed = 1, install_path = ? WHERE id = ?`, [
      installPath,
      gameId,
    ]);
  }

  /**
   * Update database after successful uninstallation
   */
  protected async markAsUninstalled(gameId: string): Promise<void> {
    await this.db.execute(`UPDATE games SET installed = 0, install_path = NULL WHERE id = ?`, [
      gameId,
    ]);
  }
}
