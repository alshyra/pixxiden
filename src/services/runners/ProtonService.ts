/**
 * ProtonService - Manages Proton-GE runner installation and configuration
 *
 * Handles:
 * - Auto-downloading latest Proton-GE from GitHub releases
 * - Extraction via Rust commands (tar.gz → ~/.local/share/pixxiden/runners/)
 * - Version tracking in SQLite settings table
 * - Providing runner paths for game launching
 *
 * Design: Silent installation on first app launch, no user prompt required.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { info, warn, error as logError, debug } from "@tauri-apps/plugin-log";
import { DatabaseService } from "../base/DatabaseService";

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases/latest";

interface GitHubRelease {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export interface ProtonConfig {
  version: string;
  protonPath: string;
  installedAt: string;
}

export class ProtonService {
  private static instance: ProtonService | null = null;
  private db: DatabaseService;
  private installing = false;
  private installPromise: Promise<ProtonConfig | null> | null = null;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): ProtonService {
    if (!ProtonService.instance) {
      ProtonService.instance = new ProtonService();
    }
    return ProtonService.instance;
  }

  /**
   * Ensure Proton-GE is installed. Downloads latest if missing.
   * Non-blocking: if already installing, returns the existing promise.
   */
  async ensureProtonInstalled(
    onProgress?: (progress: number, status: string) => void,
  ): Promise<ProtonConfig | null> {
    // If already installing, return the existing promise
    if (this.installPromise) {
      return this.installPromise;
    }

    // Wrap the entire check+install flow in a single promise
    // to avoid race conditions between concurrent callers
    this.installPromise = this.doEnsureInstalled(onProgress).finally(() => {
      this.installPromise = null;
      this.installing = false;
    });

    return this.installPromise;
  }

  /**
   * Internal: check config + disk, install if needed.
   */
  private async doEnsureInstalled(
    onProgress?: (progress: number, status: string) => void,
  ): Promise<ProtonConfig | null> {
    // Check if we already have a configured version
    const config = await this.getInstalledConfig();
    if (config) {
      // Verify the binary still exists on disk
      const exists = await invoke<boolean>("check_runner_exists", { version: config.version });
      if (exists) {
        await debug(`[ProtonService] ${config.version} already installed at ${config.protonPath}`);
        return config;
      }
      await warn(`[ProtonService] ${config.version} missing from disk, reinstalling...`);
    }

    return this.doInstall(onProgress);
  }

  /**
   * Internal: perform the actual download + extraction + configuration.
   */
  private async doInstall(
    onProgress?: (progress: number, status: string) => void,
  ): Promise<ProtonConfig | null> {
    this.installing = true;

    try {
      await info("[ProtonService] Fetching latest release from GitHub...");
      onProgress?.(0, "Recherche de la dernière version...");

      const release = await this.getLatestRelease();
      const tarball = release.assets.find((a) => a.name.endsWith(".tar.gz"));
      if (!tarball) {
        throw new Error("No .tar.gz asset found in latest release");
      }

      const sizeMB = (tarball.size / 1024 / 1024).toFixed(0);
      await info(`[ProtonService] Found ${release.tag_name}: ${tarball.name} (${sizeMB} MB)`);
      onProgress?.(5, `Téléchargement de ${release.tag_name} (${sizeMB} MB)...`);

      // Get runners directory path (Rust creates it if needed)
      const runnersDir = await invoke<string>("get_runners_dir");
      const tempPath = `${runnersDir}/${tarball.name}`;

      // Listen for download progress events from Rust backend
      const unlisten = await listen<{ downloaded: number; total: number; progress: number }>(
        "download-progress",
        (event) => {
          const p = event.payload.progress;
          // Download phase = 0-75% of total progress
          onProgress?.(Math.round(p * 0.75), `Téléchargement... ${p}%`);
        },
      );

      try {
        // Download via Rust (streams directly to disk, no memory buffering)
        await invoke("download_file", {
          url: tarball.browser_download_url,
          dest: tempPath,
        });
      } finally {
        unlisten();
      }

      onProgress?.(80, "Extraction en cours...");
      await info("[ProtonService] Extracting tarball...");

      // Extract via Rust (tar.gz → directory)
      await invoke("extract_runner_tarball", {
        source: tempPath,
        dest: runnersDir,
      });

      onProgress?.(95, "Vérification...");

      // Verify the proton binary exists after extraction
      const protonPath = await invoke<string | null>("get_runner_path", {
        version: release.tag_name,
      });
      if (!protonPath) {
        throw new Error(`Proton binary not found after extraction for ${release.tag_name}`);
      }

      // Save configuration to settings table
      const config: ProtonConfig = {
        version: release.tag_name,
        protonPath,
        installedAt: new Date().toISOString(),
      };
      await this.saveConfig(config);

      onProgress?.(100, "Terminé !");
      await info(`[ProtonService] ${release.tag_name} installed at ${protonPath}`);

      return config;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await logError(`[ProtonService] Installation failed: ${msg}`);
      onProgress?.(-1, `Erreur: ${msg}`);
      return null;
    }
  }

  /**
   * Get the currently installed Proton config from database settings.
   */
  async getInstalledConfig(): Promise<ProtonConfig | null> {
    try {
      const rows = await this.db.select<{ key: string; value: string }>(
        "SELECT key, value FROM settings WHERE key LIKE 'proton_ge_%'",
      );

      const map: Record<string, string> = {};
      for (const row of rows) {
        map[row.key] = row.value;
      }

      if (!map.proton_ge_version || !map.proton_ge_path) {
        return null;
      }

      return {
        version: map.proton_ge_version,
        protonPath: map.proton_ge_path,
        installedAt: map.proton_ge_installed_at || "",
      };
    } catch {
      return null;
    }
  }

  /**
   * Save Proton config to the settings table (UPSERT).
   */
  private async saveConfig(config: ProtonConfig): Promise<void> {
    const entries = [
      ["proton_ge_version", config.version],
      ["proton_ge_path", config.protonPath],
      ["proton_ge_installed_at", config.installedAt],
    ];

    for (const [key, value] of entries) {
      await this.db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
      );
    }
  }

  /**
   * Fetch the latest Proton-GE release info from GitHub API.
   */
  private async getLatestRelease(): Promise<GitHubRelease> {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Pixxiden-Launcher",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get the path to the proton binary, or null if not installed.
   */
  async getProtonPath(): Promise<string | null> {
    const config = await this.getInstalledConfig();
    return config?.protonPath ?? null;
  }

  /**
   * Get the prefixes base directory (creates it if needed).
   */
  async getPrefixesDir(): Promise<string> {
    return invoke<string>("get_prefixes_dir");
  }

  /** Check if Proton is currently being installed */
  isInstalling(): boolean {
    return this.installing;
  }

  /** Get list of all installed runner versions */
  async getInstalledVersions(): Promise<string[]> {
    return invoke<string[]>("get_installed_runners");
  }

  /** Remove a specific runner version */
  async removeVersion(version: string): Promise<void> {
    await invoke("remove_runner", { version });

    // If this was our configured version, clear the config
    const config = await this.getInstalledConfig();
    if (config?.version === version) {
      await this.db.execute("DELETE FROM settings WHERE key LIKE 'proton_ge_%'");
    }
  }
}
