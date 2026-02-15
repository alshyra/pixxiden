/**
 * LaunchStrategy - Interface for store-specific game launch logic
 *
 * Each store (Epic, GOG, Amazon, Steam) has its own strategy for:
 * - Building the CLI command array to launch a game
 * - Building environment variables needed at launch time
 *
 * Strategies are stateless — all context is passed via method arguments.
 */

import type { Game } from "@/types";

/**
 * Context provided to launch strategies for building commands and env vars.
 */
export interface LaunchContext {
  /** Resolved Proton binary path, or null if not using Proton */
  protonPath: string | null;
  /** Command prefix to clean Python-related env vars (for PyInstaller sidecars) */
  cleanEnvPrefix: string;
  /** STEAM_COMPAT_DATA_PATH — Wine prefix directory for Proton */
  compatDataPath: string;
  /** STEAM_COMPAT_CLIENT_INSTALL_PATH — fake Steam install dir for Proton */
  compatClientInstallPath: string;
}

/**
 * Result of a launch strategy's preparation.
 */
export interface LaunchPreparation {
  /** Command array to execute (e.g. ["legendary", "launch", "AppName", ...]) */
  command: string[];
  /** Environment variables to set for the process */
  env: Record<string, string>;
}

/**
 * Strategy interface — one implementation per store.
 */
export interface LaunchStrategy {
  /**
   * Build the full launch command array for a game.
   */
  buildCommand(game: Game, context: LaunchContext): Promise<string[]>;

  /**
   * Build environment variables for launching a game.
   * Returns only the store-specific env vars (Proton env is handled by LaunchService).
   */
  buildEnv(game: Game, context: LaunchContext): Promise<Record<string, string>>;
}
