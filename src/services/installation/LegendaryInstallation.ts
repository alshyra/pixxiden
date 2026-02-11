/**
 * LegendaryInstallation - Epic Games installation via legendary CLI
 *
 * Uses streaming spawn to get real-time progress from legendary's stderr output.
 * Legendary outputs progress lines like:
 *   [DLManager] INFO: = Progress: 15.23% (2.00/13.12 GiB), Running for 00:02:35, ETA: 00:12:10
 *   [DLManager] INFO:  + Download   - 109.34 MiB/s (raw) / 109.34 MiB/s (decompressed)
 */

import {
  GameInstallationService,
  type InstallOptions,
  type InstallProgress,
  type GameSizeInfo,
} from "./GameInstallationService";
import type { StoreType } from "@/types";

export class LegendaryInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "epic";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    const args = ["install", storeId, "-y"];

    if (options.installPath) {
      args.push("--base-path", options.installPath);
    }

    // Spawn with streaming — get real-time progress from legendary output
    const handle = await this.sidecar.spawnLegendaryStreaming(args, {
      onStdout: (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        options.onProgress?.({
          gameId,
          status: "downloading",
          progress: -1, // don't override current progress
          outputLine: trimmed,
        });
      },
      onStderr: (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Try to parse progress data from legendary's stderr
        const progressData = parseLegendaryProgress(trimmed);
        if (progressData) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: progressData.progress ?? -1,
            outputLine: trimmed,
          });
        } else {
          // No parseable progress — still forward the line for display
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: -1,
            outputLine: trimmed,
          });
        }
      },
    });

    // Store child for cancellation support
    this.activeChildren.set(gameId, handle.child);

    try {
      const result = await handle.completion;

      if (result.code !== 0) {
        throw new Error(`legendary install exited with code ${result.code}`);
      }

      // Mark as installed in database
      if (options.installPath) {
        await this.markAsInstalled(gameId, options.installPath);
      }
    } finally {
      this.activeChildren.delete(gameId);
    }
  }

  async uninstall(gameId: string, storeId: string): Promise<void> {
    const result = await this.sidecar.runLegendary(["uninstall", storeId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Epic game: ${result.stderr}`);
    }

    await this.markAsUninstalled(gameId);
  }

  /**
   * Get game size info from `legendary info <storeId>`.
   * Parses "Disk size (uncompressed)" and "Download size (compressed)" from output.
   */
  async getGameInfo(storeId: string): Promise<GameSizeInfo | null> {
    const result = await this.sidecar.runLegendary(["info", storeId]);
    const output = result.stdout + "\n" + result.stderr;

    const diskMatch = output.match(/Disk size \(uncompressed\):\s*(.+)/);
    const downloadMatch = output.match(/Download size \(compressed\):\s*(.+)/);

    if (!diskMatch && !downloadMatch) return null;

    return {
      diskSize: diskMatch?.[1]?.trim() ?? "Unknown",
      downloadSize: downloadMatch?.[1]?.trim() ?? "Unknown",
    };
  }
}

// =============================================================================
// Legendary output parsers
// =============================================================================

/**
 * Parse a legendary stderr line for progress data.
 *
 * Recognized patterns:
 * - Progress: 15.23% (2.00/13.12 GiB), Running for 00:02:35, ETA: 00:12:10
 * - Download   - 109.34 MiB/s (raw)
 */
function parseLegendaryProgress(line: string): Partial<InstallProgress> | null {
  // Progress line
  const progressMatch = line.match(
    /Progress:\s*([\d.]+)%\s*\(([\d.]+)\s*\/\s*([\d.]+)\s*(\w+)\).*?ETA:\s*(\d+:\d+:\d+)/,
  );
  if (progressMatch) {
    const [, percent, downloaded, total, unit, eta] = progressMatch;
    return {
      progress: parseFloat(percent),
      downloadedSize: `${downloaded} ${unit}`,
      totalSize: `${total} ${unit}`,
      eta: parseEtaToSeconds(eta),
    };
  }

  // Download speed line
  const speedMatch = line.match(/Download\s+-\s*([\d.]+)\s*(\w+)\/s\s*\(raw\)/);
  if (speedMatch) {
    let speed = parseFloat(speedMatch[1]);
    const unit = speedMatch[2];
    // Normalize to MB/s
    if (unit === "KiB" || unit === "KB") speed /= 1024;
    if (unit === "GiB" || unit === "GB") speed *= 1024;
    // MiB → MB is close enough for display
    return {
      progress: -1, // don't override
      downloadSpeed: speed,
    };
  }

  // Verification / Finishing
  if (line.includes("Finished installation") || line.includes("Installation finished")) {
    return {
      progress: 100,
      status: "completed",
    };
  }

  if (line.includes("Verifying")) {
    return {
      progress: -1,
      status: "installing",
    };
  }

  return null;
}

function parseEtaToSeconds(eta: string): number {
  const parts = eta.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
