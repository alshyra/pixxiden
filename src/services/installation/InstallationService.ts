/**
 * InstallationService - Orchestrator for game installations
 * Delegates to store-specific installation services
 */

import type { StoreType } from "@/types";
import { SidecarService } from "../base/SidecarService";
import { DatabaseService } from "../base/DatabaseService";
import { LegendaryInstallation } from "./LegendaryInstallation";
import { GogdlInstallation } from "./GogdlInstallation";
import { NileInstallation } from "./NileInstallation";
import { SteamInstallation } from "./SteamInstallation";
import type { InstallProgress, InstallOptions } from "./GameInstallationService";

export type { InstallProgress, InstallOptions } from "./GameInstallationService";

export class InstallationService {
  private activeInstalls = new Map<string, AbortController>();
  private legendary: LegendaryInstallation;
  private gogdl: GogdlInstallation;
  private nile: NileInstallation;
  private steam: SteamInstallation;

  constructor(sidecar: SidecarService, db: DatabaseService) {
    this.legendary = new LegendaryInstallation(sidecar, db);
    this.gogdl = new GogdlInstallation(sidecar, db);
    this.nile = new NileInstallation(sidecar, db);
    this.steam = new SteamInstallation(sidecar, db);
  }

  /**
   * Install a game from a specific store
   */
  async installGame(
    gameId: string,
    store: StoreType,
    options: InstallOptions = {},
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeInstalls.set(gameId, abortController);

    try {
      // Emit initial status
      options.onProgress?.({
        gameId,
        status: "queued",
        progress: 0,
      });

      // Extract raw store ID (remove "epic-", "gog-", etc. prefix)
      const storeId = this.extractStoreId(gameId);

      // Route to appropriate store service
      switch (store) {
        case "epic":
          await this.legendary.install(gameId, storeId, options);
          break;
        case "gog":
          await this.gogdl.install(gameId, storeId, options);
          break;
        case "amazon":
          await this.nile.install(gameId, storeId, options);
          break;
        case "steam":
          await this.steam.install(gameId, storeId, options);
          break;
        default:
          throw new Error(`Unsupported store: ${store}`);
      }

      // Emit completion
      options.onProgress?.({
        gameId,
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      options.onProgress?.({
        gameId,
        status: "error",
        progress: 0,
        error: errorMsg,
      });
      throw error;
    } finally {
      this.activeInstalls.delete(gameId);
    }
  }

  /**
   * Uninstall a game
   */
  async uninstallGame(
    gameId: string,
    store: StoreType,
    options: {
      onProgress?: (progress: InstallProgress) => void;
    } = {},
  ): Promise<void> {
    try {
      options.onProgress?.({
        gameId,
        status: "queued",
        progress: 0,
      });

      // Extract raw store ID (remove "epic-", "gog-", etc. prefix)
      const storeId = this.extractStoreId(gameId);

      // Route to appropriate store service
      switch (store) {
        case "epic":
          await this.legendary.uninstall(gameId, storeId);
          break;
        case "gog":
          await this.gogdl.uninstall(gameId, storeId);
          break;
        case "amazon":
          await this.nile.uninstall(gameId, storeId);
          break;
        case "steam":
          await this.steam.uninstall(gameId, storeId);
          break;
        default:
          throw new Error(`Unsupported store: ${store}`);
      }

      options.onProgress?.({
        gameId,
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      options.onProgress?.({
        gameId,
        status: "error",
        progress: 0,
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Cancel an ongoing installation
   */
  async cancelInstallation(gameId: string): Promise<void> {
    const controller = this.activeInstalls.get(gameId);
    if (controller) {
      controller.abort();
      this.activeInstalls.delete(gameId);
    }
  }

  /**
   * Check if a game is currently being installed
   */
  isInstalling(gameId: string): boolean {
    return this.activeInstalls.has(gameId);
  }

  /**
   * Get all active installations
   */
  getActiveInstallations(): string[] {
    return Array.from(this.activeInstalls.keys());
  }

  // ===== Helpers =====

  /**
   * Extract the raw store ID from a Pixxiden game ID.
   * Game IDs are prefixed: "epic-{app_name}", "gog-{product_id}", "amazon-{id}", "steam-{appId}".
   * CLIs need the raw store ID without the prefix.
   */
  private extractStoreId(gameId: string): string {
    const idx = gameId.indexOf("-");
    return idx !== -1 ? gameId.substring(idx + 1) : gameId;
  }
}
