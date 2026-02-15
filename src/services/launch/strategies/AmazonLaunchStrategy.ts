/**
 * AmazonLaunchStrategy - Launch logic for Amazon Games (via nile CLI)
 *
 * Amazon/Nile doesn't support Proton natively — launches directly.
 */

import type { Game } from "@/types";
import type { LaunchContext, LaunchStrategy } from "./LaunchStrategy";

export class AmazonLaunchStrategy implements LaunchStrategy {
  async buildCommand(game: Game, _context: LaunchContext): Promise<string[]> {
    return ["nile", "launch", game.storeData.storeId];
  }

  async buildEnv(_game: Game, _context: LaunchContext): Promise<Record<string, string>> {
    return {};
  }
}
