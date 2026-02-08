/**
 * GameLaunchService - Manages game process launching and lifecycle
 *
 * Replaces the missing Rust `launch_game_v2` command with a JS-first approach.
 * Games are launched through their respective sidecars (legendary, gogdl, nile)
 * using streaming spawn for process tracking and force-close support.
 *
 * Steam games are launched via steam:// protocol URL.
 */

import { SidecarService, type StreamingHandle, type SidecarName } from "../base/SidecarService";
import type { Game } from "@/types";
import { open } from "@tauri-apps/plugin-shell";
import { info, debug, warn, error as logError } from "@tauri-apps/plugin-log";

export class GameLaunchService {
  private static instance: GameLaunchService | null = null;
  private sidecar: SidecarService;
  private activeGames = new Map<string, StreamingHandle>();

  private constructor() {
    this.sidecar = SidecarService.getInstance();
  }

  static getInstance(): GameLaunchService {
    if (!GameLaunchService.instance) {
      GameLaunchService.instance = new GameLaunchService();
    }
    return GameLaunchService.instance;
  }

  /**
   * Launch a game using a pre-built launch command from the orchestrator.
   *
   * @param game - The game to launch
   * @param launchCommand - Command array, e.g. ["legendary", "launch", "AppName", "--wine", "..."]
   * @param env - Environment variables (reserved for future use)
   * @param callbacks - Optional lifecycle callbacks
   */
  async launchFromCommand(
    game: Game,
    launchCommand: string[],
    _env: Record<string, string> = {},
    callbacks: {
      onExit?: (code: number) => void;
      onError?: (error: string) => void;
      onOutput?: (line: string) => void;
    } = {},
  ): Promise<void> {
    if (this.activeGames.has(game.id)) {
      await warn(`[GameLaunch] ${game.info.title} is already running`);
      return;
    }

    // Steam games use protocol handler, not sidecar
    if (game.storeData.store === "steam") {
      await this.launchSteamGame(game);
      return;
    }

    // Parse command: first element is the sidecar name, rest are args
    const [sidecarName, ...args] = launchCommand;

    await info(`[GameLaunch] Launching ${game.info.title} via ${sidecarName}: ${args.join(" ")}`);

    const handle = await this.sidecar.spawnStreaming(sidecarName as SidecarName, args, {
      onStdout: (line) => {
        const trimmed = line.trim();
        if (trimmed) {
          callbacks.onOutput?.(trimmed);
          debug(`[${game.info.title}] ${trimmed}`);
        }
      },
      onStderr: (line) => {
        const trimmed = line.trim();
        if (trimmed) {
          callbacks.onOutput?.(trimmed);
          debug(`[${game.info.title}] ${trimmed}`);
        }
      },
    });

    this.activeGames.set(game.id, handle);

    // Monitor game exit in background (non-blocking)
    handle.completion
      .then(async (result) => {
        this.activeGames.delete(game.id);
        await info(`[GameLaunch] ${game.info.title} exited with code ${result.code}`);
        callbacks.onExit?.(result.code);
      })
      .catch(async (error) => {
        this.activeGames.delete(game.id);
        const msg = error instanceof Error ? error.message : String(error);
        await logError(`[GameLaunch] ${game.info.title} error: ${msg}`);
        callbacks.onError?.(msg);
      });
  }

  /** Force close a running game */
  async forceClose(gameId: string): Promise<void> {
    const handle = this.activeGames.get(gameId);
    if (handle) {
      await info(`[GameLaunch] Force closing game ${gameId}`);
      await handle.kill();
      this.activeGames.delete(gameId);
    } else {
      await warn(`[GameLaunch] No active process for ${gameId}`);
    }
  }

  /** Check if a game is currently running */
  isRunning(gameId: string): boolean {
    return this.activeGames.has(gameId);
  }

  /** Get all currently running game IDs */
  getRunningGames(): string[] {
    return Array.from(this.activeGames.keys());
  }

  /** Launch a Steam game via steam:// protocol */
  private async launchSteamGame(game: Game): Promise<void> {
    const url = `steam://rungameid/${game.storeData.storeId}`;
    await info(`[GameLaunch] Opening Steam URL: ${url}`);
    await open(url);
  }
}
