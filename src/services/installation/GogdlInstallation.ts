/**
 * GogdlInstallation - GOG installation via gogdl CLI
 *
 * Uses streaming spawn to get real-time progress from gogdl's stdout output.
 * gogdl outputs JSON progress objects per line:
 *   {"progress": 50.0, "downloadedSize": 524288000, "totalSize": 1073741824,
 *    "speed": "10.5 MiB/s", "eta": "1:23:45", "gameTitle": "..."}
 */

import { GameInstallationService, type InstallOptions, type InstallProgress } from "./GameInstallationService";
import type { StoreType } from "@/types";
import { appConfigDir, join, homeDir } from "@tauri-apps/api/path";
import { debug, warn } from "@tauri-apps/plugin-log";

export class GogdlInstallation extends GameInstallationService {
  get storeName(): StoreType {
    return "gog";
  }

  async install(gameId: string, storeId: string, options: InstallOptions): Promise<void> {
    options.onProgress?.({
      gameId,
      status: "downloading",
      progress: 0,
    });

    // gogdl download requires: --auth-config-path (before subcommand), --platform, --path
    // gogdl auto-appends the game's folder_name to --path, so pass the parent directory.
    const authPath = await this.getAuthConfigPath();
    const installDir = options.installPath || (await this.getDefaultInstallPath());
    const platform = options.platform || "linux";

    const args = [
      "--auth-config-path",
      authPath,
      "download",
      storeId,
      "--platform",
      platform,
      "--path",
      installDir,
    ];

    if (options.language) {
      args.push("--lang", options.language);
    }

    // Spawn with streaming — get real-time progress from gogdl JSON output
    const handle = await this.sidecar.spawnGogdlStreaming(args, {
      onStdout: (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const progressData = parseGogdlProgress(trimmed);
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
        await debug(`[GOG Install] ${trimmed}`);
        const progressData = parseGogdlProgress(trimmed);
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
    });

    // Store child for cancellation support
    this.activeChildren.set(gameId, handle.child);

    try {
      const result = await handle.completion;

      if (result.code !== 0) {
        throw new Error(`gogdl download exited with code ${result.code}`);
      }

      // Mark as installed in database
      await this.markAsInstalled(gameId, installDir);
    } catch (err) {
      await warn(`[GOG Install] Failed: ${err}`);
      throw err;
    } finally {
      this.activeChildren.delete(gameId);
    }
  }

  async uninstall(gameId: string, _storeId: string): Promise<void> {
    // gogdl doesn't have a dedicated uninstall command
    // Game files can be deleted directly from the install path
    // For now, just update the DB status
    await this.markAsUninstalled(gameId);
  }

  /**
   * Get the gogdl auth config path.
   * Mirrors GogdlService.getAuthConfigPath().
   */
  private async getAuthConfigPath(): Promise<string> {
    try {
      const configDir = await appConfigDir();
      return await join(configDir, "gog_auth.json");
    } catch {
      return "~/.config/pixxiden/gog_auth.json";
    }
  }

  /**
   * Get a default install path when none is specified.
   */
  private async getDefaultInstallPath(): Promise<string> {
    try {
      const home = await homeDir();
      return await join(home, "Games", "GOG");
    } catch {
      return "~/Games/GOG";
    }
  }
}

// =============================================================================
// gogdl output parsers
// =============================================================================

/**
 * Parse a gogdl stderr/stdout line for progress data.
 *
 * gogdl (heroic-gogdl) outputs text progress to stderr:
 *   "[PROGRESS] INFO: = Progress: 23.53 2729086102/11596594070, Running for: 00:02:25, ETA: 00:07:54"
 *   "[PROGRESS] INFO: = Downloaded: 630.60 MiB, Written: 2602.66 MiB"
 *   "[PROGRESS] INFO:  + Download   - 10.80 MiB/s (raw) / 10.80 MiB/s (decompressed)"
 *
 * Some versions may output JSON objects to stdout — handled as fallback.
 */
function parseGogdlProgress(line: string): Partial<InstallProgress> | null {
  // Heroic-gogdl text format — primary format:
  // "[PROGRESS] INFO: = Progress: 23.53 2729086102/11596594070, Running for: 00:02:25, ETA: 00:07:54"
  const progressMatch = line.match(
    /INFO:\s*=\s*Progress:\s*(\d+(?:\.\d+)?)\s+(\d+)\/(\d+),.*ETA:\s*(\S+)/
  );
  if (progressMatch) {
    const pct = parseFloat(progressMatch[1]);
    const dlBytes = parseInt(progressMatch[2], 10);
    const totalBytes = parseInt(progressMatch[3], 10);
    const eta = progressMatch[4];
    return {
      progress: Math.min(100, Math.max(0, pct)),
      downloadedSize: formatBytes(dlBytes),
      totalSize: formatBytes(totalBytes),
      outputLine: `ETA: ${eta}`,
    };
  }

  // Download speed line:
  // "[PROGRESS] INFO:  + Download   - 10.80 MiB/s (raw) / 10.80 MiB/s (decompressed)"
  const speedMatch = line.match(/INFO:\s*\+\s*Download\s*-\s*([\d.]+ MiB\/s)/);
  if (speedMatch) {
    return { outputLine: `↓ ${speedMatch[1]}` };
  }

  // JSON format (some gogdl versions)
  if (line.startsWith("{")) {
    try {
      const data = JSON.parse(line);
      if (typeof data.progress === "number") {
        const result: Partial<InstallProgress> = {
          progress: Math.min(100, Math.max(0, data.progress)),
        };
        if (data.downloadedSize != null) {
          result.downloadedSize =
            typeof data.downloadedSize === "number"
              ? formatBytes(data.downloadedSize)
              : String(data.downloadedSize);
        }
        if (data.totalSize != null) {
          result.totalSize =
            typeof data.totalSize === "number"
              ? formatBytes(data.totalSize)
              : String(data.totalSize);
        }
        if (data.eta != null && data.speed != null) {
          result.outputLine = `${data.speed} — ETA: ${data.eta}`;
        } else if (data.speed != null) {
          result.outputLine = `Speed: ${data.speed}`;
        }
        return result;
      }
    } catch {
      // not JSON — continue
    }
  }

  // Fallback: plain text "Progress: 50%" or "50.00% ..."
  const pctMatch = line.match(/(?:Progress:?\s*)?(\d+(?:\.\d+)?)%/);
  if (pctMatch) {
    return { progress: parseFloat(pctMatch[1]) };
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GiB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${bytes} B`;
}
