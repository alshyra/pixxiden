/**
 * SidecarService - Low-level wrapper for CLI tools (legendary, gogdl, nile, steam)
 * Executes sidecars via Tauri shell plugin
 */

import { Command } from "@tauri-apps/plugin-shell";

export interface SidecarResult {
  stdout: string;
  stderr: string;
  code: number;
}

export type SidecarName = "legendary" | "gogdl" | "nile" | "steam";

export class SidecarService {
  private static instance: SidecarService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SidecarService {
    if (!SidecarService.instance) {
      SidecarService.instance = new SidecarService();
    }
    return SidecarService.instance;
  }

  /**
   * Run a sidecar command
   */
  private async run(sidecar: SidecarName, args: string[]): Promise<SidecarResult> {
    try {
      console.log(`🔧 Running ${sidecar} with args:`, args);

      const command = Command.sidecar(`binaries/${sidecar}`, args);
      const output = await command.execute();

      const result: SidecarResult = {
        stdout: output.stdout,
        stderr: output.stderr,
        code: output.code ?? 0,
      };

      if (result.code !== 0) {
        console.warn(`⚠️ ${sidecar} exited with code ${result.code}:`, result.stderr);
      }

      return result;
    } catch (error) {
      console.error(`❌ ${sidecar} execution failed:`, error);
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        code: -1,
      };
    }
  }

  /**
   * Run legendary CLI (Epic Games)
   */
  async runLegendary(args: string[]): Promise<SidecarResult> {
    return this.run("legendary", args);
  }

  /**
   * Run gogdl CLI (GOG)
   */
  async runGogdl(args: string[]): Promise<SidecarResult> {
    return this.run("gogdl", args);
  }

  /**
   * Run nile CLI (Amazon Games)
   */
  async runNile(args: string[]): Promise<SidecarResult> {
    return this.run("nile", args);
  }

  /**
   * Run steam helper (if needed)
   */
  async runSteam(args: string[]): Promise<SidecarResult> {
    return this.run("steam", args);
  }

  /**
   * Check if a sidecar is available
   */
  async isAvailable(sidecar: SidecarName): Promise<boolean> {
    try {
      const result = await this.run(sidecar, ["--version"]);
      return result.code === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get version of a sidecar
   */
  async getVersion(sidecar: SidecarName): Promise<string | null> {
    try {
      const result = await this.run(sidecar, ["--version"]);
      if (result.code === 0) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Export singleton getter for convenience
export function getSidecar(): SidecarService {
  return SidecarService.getInstance();
}
