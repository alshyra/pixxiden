/**
 * NileInstallation - Amazon Games installation via nile CLI
 *
 * Uses streaming spawn to get real-time progress from nile's output.
 * nile outputs JSON progress objects to stdout during download (same format as legendary).
 */

import { GameInstallationService, type InstallOptions, type InstallProgress } from "./GameInstallationService";
import type { StoreType } from "@/types";
import { debug, warn } from "@tauri-apps/plugin-log";

export class NileInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "amazon";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    const args = ["install", storeId, "--yes"];

    if (options.installPath) {
      args.push("--path", options.installPath);
    }

    // Spawn with streaming — get real-time progress from nile output
    const handle = await this.sidecar.spawnNileStreaming(args, {
      onStdout: (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const progressData = parseNileProgress(trimmed);
        if (progressData) {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: -1,
            ...progressData,
          });
        } else {
          options.onProgress?.({
            gameId,
            status: "downloading",
            progress: -1,
            outputLine: trimmed,
          });
        }
      },
      onStderr: async (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        await debug(`[Amazon Install] ${trimmed}`);
        options.onProgress?.({
          gameId,
          status: "downloading",
          progress: -1,
          outputLine: trimmed,
        });
      },
    });

    // Store child for cancellation support
    this.activeChildren.set(gameId, handle.child);

    try {
      const result = await handle.completion;

      if (result.code !== 0) {
        throw new Error(`nile install exited with code ${result.code}`);
      }

      // Mark as installed in database
      if (options.installPath) {
        await this.markAsInstalled(gameId, options.installPath);
      }
    } catch (err) {
      await warn(`[Amazon Install] Failed: ${err}`);
      throw err;
    } finally {
      this.activeChildren.delete(gameId);
    }
  }

  async uninstall(gameId: string, storeId: string): Promise<void> {
    const result = await this.sidecar.runNile(["uninstall", storeId, "--yes"]);

    if (result.code !== 0) {
      throw new Error(`Failed to uninstall Amazon game: ${result.stderr}`);
    }

    await this.markAsUninstalled(gameId);
  }
}

// =============================================================================
// nile output parsers
// =============================================================================

/**
 * Parse a nile stdout line for progress data.
 * nile uses legendary-compatible progress output:
 *   [DLManager] INFO: = Progress: 15.23% (2.00/13.12 GiB), Running for 00:02:35, ETA: 00:12:10
 *   OR JSON format similar to gogdl
 */
function parseNileProgress(line: string): Partial<InstallProgress> | null {
  // Try JSON first
  if (line.startsWith("{")) {
    try {
      const data = JSON.parse(line);
      if (typeof data.progress === "number") {
        return {
          progress: Math.min(100, Math.max(0, data.progress)),
          downloadedSize: data.downloadedSize ? String(data.downloadedSize) : undefined,
          totalSize: data.totalSize ? String(data.totalSize) : undefined,
        };
      }
    } catch {
      // not JSON
    }
  }

  // Legendary-style progress line
  const progressMatch = line.match(
    /Progress:\s*([\d.]+)%\s*\(([\d.]+)\s*\/\s*([\d.]+)\s*(\w+)\).*?ETA:\s*(\d+:\d+:\d+)/,
  );
  if (progressMatch) {
    const [, percent, downloaded, total, unit] = progressMatch;
    return {
      progress: parseFloat(percent),
      downloadedSize: `${downloaded} ${unit}`,
      totalSize: `${total} ${unit}`,
    };
  }

  // Simple percentage
  const pctMatch = line.match(/(?:Progress:?\s*)?(\d+(?:\.\d+)?)%/);
  if (pctMatch) {
    return { progress: parseFloat(pctMatch[1]) };
  }

  return null;
}
