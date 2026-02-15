/**
 * SteamLaunchStrategy - Launch logic for Steam games
 *
 * Steam handles Proton/Wine internally — we just pass the app ID.
 * Actual process spawning uses steam:// protocol (handled by GameLaunchService).
 */

import type { Game } from "@/types";
import type { LaunchContext, LaunchStrategy } from "./LaunchStrategy";

export class SteamLaunchStrategy implements LaunchStrategy {
  async buildCommand(game: Game, _context: LaunchContext): Promise<string[]> {
    return ["steam", "-applaunch", game.storeData.storeId];
  }

  async buildEnv(_game: Game, _context: LaunchContext): Promise<Record<string, string>> {
    // Steam manages its own environment
    return {};
  }
}
