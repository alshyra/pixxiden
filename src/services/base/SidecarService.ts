/**
 * SidecarService - Low-level wrapper for CLI tools (legendary, gogdl, nile, steam)
 * Executes sidecars via Tauri shell plugin
 */

import { Command, type Child } from "@tauri-apps/plugin-shell";
import { debug, warn, error as logError } from "@tauri-apps/plugin-log";

export interface SidecarResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Handle returned by spawnStreaming() for controlling a long-running sidecar process.
 * - `child`: the Tauri Child process (for kill)
 * - `completion`: resolves when the process exits
 * - `kill()`: kills the process
 */
export interface StreamingHandle {
  child: Child;
  completion: Promise<{ code: number }>;
  kill: () => Promise<void>;
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
      await debug(`Running ${sidecar} with args: ${JSON.stringify(args)}`);
      // pas touche ca marche
      const command = Command.sidecar(`binaries/${sidecar}`, args);
      const output = await command.execute();

      const result: SidecarResult = {
        stdout: output.stdout,
        stderr: output.stderr,
        code: output.code ?? 0,
      };

      if (result.code !== 0) {
        await warn(
          `${sidecar} exited with code ${result.code}: ${result.stderr.substring(0, 200)}`,
        );
      }

      return result;
    } catch (error) {
      await logError(
        `${sidecar} execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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
   * Spawn a sidecar with real-time stdout/stderr streaming.
   * Use for long-running processes (installation, downloads).
   * Unlike run(), this does NOT block until completion — it streams output line by line.
   */
  async spawnStreaming(
    sidecar: SidecarName,
    args: string[],
    callbacks: {
      onStdout?: (line: string) => void;
      onStderr?: (line: string) => void;
    } = {},
  ): Promise<StreamingHandle> {
    await debug(`[SidecarService] Spawning (streaming) ${sidecar}: ${JSON.stringify(args)}`);

    const command = Command.sidecar(`binaries/${sidecar}`, args);

    command.stdout.on("data", (line) => {
      callbacks.onStdout?.(line);
    });

    command.stderr.on("data", (line) => {
      callbacks.onStderr?.(line);
    });

    const completion = new Promise<{ code: number }>((resolve, reject) => {
      command.on("close", (data) => {
        resolve({ code: data.code ?? 0 });
      });
      command.on("error", (error) => {
        reject(new Error(error));
      });
    });

    const child = await command.spawn();
    await debug(`[SidecarService] Spawned ${sidecar} PID=${child.pid}`);

    return {
      child,
      completion,
      kill: () => child.kill(),
    };
  }

  /**
   * Spawn legendary CLI with real-time streaming (for install/download)
   */
  async spawnLegendaryStreaming(
    args: string[],
    callbacks: {
      onStdout?: (line: string) => void;
      onStderr?: (line: string) => void;
    } = {},
  ): Promise<StreamingHandle> {
    return this.spawnStreaming("legendary", args, callbacks);
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

  /**
   * Run an arbitrary system command
   */
  async runCommand(command: string, args: string[]): Promise<SidecarResult> {
    try {
      await debug(`Running command: ${command} with args: ${JSON.stringify(args)}`);

      const cmd = Command.create(command, args);
      const output = await cmd.execute();

      const result: SidecarResult = {
        stdout: output.stdout,
        stderr: output.stderr,
        code: output.code ?? 0,
      };

      if (result.code !== 0) {
        await warn(
          `${command} exited with code ${result.code}: ${result.stderr.substring(0, 200)}`,
        );
      }

      return result;
    } catch (error) {
      await logError(
        `${command} execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        code: -1,
      };
    }
  }
}

// Export singleton getter for convenience
export function getSidecar(): SidecarService {
  return SidecarService.getInstance();
}
