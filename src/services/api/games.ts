/**
 * Game-related API functions
 */
import type { Game, CacheStats } from "@/types";
import { invoke } from "./core";

export interface SyncResult {
  total_synced: number;
  errors: string[];
}

export interface GameConfig {
  id: string;
  title: string;
  store: string;
  storeId: string;
  installPath: string | null;
  customExecutable: string | null;
  winePrefix: string | null;
  wineVersion: string | null;
  installed: boolean;
  downloadSize?: number;
  version?: string;
}

export async function getGames(): Promise<Game[]> {
  try {
    const games = await invoke<Game[]>("get_games");
    return games;
  } catch (error) {
    console.error("Failed to get games:", error);
    throw error;
  }
}

export async function getGame(gameId: string): Promise<Game | null> {
  try {
    const game = await invoke<Game | null>("get_game", { id: gameId });
    return game;
  } catch (error) {
    console.error("Failed to get game:", error);
    throw error;
  }
}

export async function clearGameCache(gameId: string): Promise<void> {
  try {
    await invoke("clear_game_cache", { gameId });
  } catch (error) {
    console.error("Failed to clear game cache:", error);
    throw error;
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await invoke("clear_all_cache");
  } catch (error) {
    console.error("Failed to clear all cache:", error);
    throw error;
  }
}

export async function getCacheStats(): Promise<CacheStats> {
  try {
    const stats = await invoke<CacheStats>("get_cache_stats");
    return stats;
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    throw error;
  }
}

export async function syncGames(): Promise<SyncResult> {
  try {
    const result = await invoke<SyncResult>("sync_games");
    return result;
  } catch (error) {
    console.error("Failed to sync games:", error);
    throw error;
  }
}

export async function scanGogInstalled(): Promise<Game[]> {
  try {
    const games = await invoke<Game[]>("scan_gog_installed");
    return games;
  } catch (error) {
    console.error("Failed to scan GOG installed games:", error);
    throw error;
  }
}

export async function launchGame(gameId: string): Promise<void> {
  try {
    await invoke("launch_game", { id: gameId });
  } catch (error) {
    console.error("Failed to launch game:", error);
    throw error;
  }
}

/**
 * @deprecated Use InstallationService.installGame() instead — install_game Rust command does not exist
 */
export async function installGame(_gameId: string, _installPath?: string): Promise<void> {
  throw new Error(
    "installGame via Rust invoke is removed. Use InstallationService.installGame() instead.",
  );
}

/**
 * @deprecated Use InstallationService.uninstallGame() instead — uninstall_game Rust command does not exist
 */
export async function uninstallGame(_gameId: string): Promise<void> {
  throw new Error(
    "uninstallGame via Rust invoke is removed. Use InstallationService.uninstallGame() instead.",
  );
}

export async function getGameConfig(id: string): Promise<GameConfig> {
  try {
    const config = await invoke<GameConfig>("get_game_config", { id });
    return config;
  } catch (error) {
    console.error("Failed to get game config:", error);
    throw error;
  }
}

export async function updateGameCustomExecutable(
  gameId: string,
  customExecutable: string | null,
): Promise<void> {
  try {
    await invoke("update_game_custom_executable", { gameId, customExecutable });
  } catch (error) {
    console.error("Failed to update custom executable:", error);
    throw error;
  }
}
