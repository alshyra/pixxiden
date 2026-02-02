/**
 * Game-related API functions
 */
import type { Game, CacheStats } from "@/types";
import { invoke, isMockMode } from "./core";
import { getMockGames } from "./mock";

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
  if (isMockMode()) {
    const mockData = await getMockGames();
    console.log("🎮 [MOCK MODE] Returning mock games:", mockData.length);
    return mockData;
  }

  try {
    const games = await invoke<Game[]>("get_games");
    return games;
  } catch (error) {
    console.error("Failed to get games:", error);
    throw error;
  }
}

export async function getGame(gameId: string): Promise<Game | null> {
  if (isMockMode()) {
    const mockData = await getMockGames();
    const game = mockData.find((g) => g.id === gameId) || null;
    console.log(`🎮 [MOCK MODE] getGame(${gameId}):`, game?.title || "not found");
    return game;
  }

  try {
    const game = await invoke<Game | null>("get_game", { id: gameId });
    return game;
  } catch (error) {
    console.error("Failed to get game:", error);
    throw error;
  }
}

export async function clearGameCache(gameId: string): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] clearGameCache:", gameId);
    return;
  }

  try {
    await invoke("clear_game_cache", { gameId });
  } catch (error) {
    console.error("Failed to clear game cache:", error);
    throw error;
  }
}

export async function clearAllCache(): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] clearAllCache");
    return;
  }

  try {
    await invoke("clear_all_cache");
  } catch (error) {
    console.error("Failed to clear all cache:", error);
    throw error;
  }
}

export async function getCacheStats(): Promise<CacheStats> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] getCacheStats");
    return {
      gamesCount: 10,
      totalAssetsCount: 40,
      totalAssetsSizeMb: 125.5,
      cacheDir: "~/.local/share/pixxiden",
    };
  }

  try {
    const stats = await invoke<CacheStats>("get_cache_stats");
    return stats;
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    throw error;
  }
}

export async function syncGames(): Promise<SyncResult> {
  if (isMockMode()) {
    const mockData = await getMockGames();
    console.log("🎮 [MOCK MODE] Syncing mock games");
    return Promise.resolve({
      total_synced: mockData.length,
      errors: [],
    });
  }

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

export async function installGame(gameId: string, _installPath?: string): Promise<void> {
  try {
    await invoke("install_game", { id: gameId });
  } catch (error) {
    console.error("Failed to install game:", error);
    throw error;
  }
}

export async function uninstallGame(gameId: string): Promise<void> {
  try {
    await invoke("uninstall_game", { id: gameId });
  } catch (error) {
    console.error("Failed to uninstall game:", error);
    throw error;
  }
}

export async function getGameConfig(id: string): Promise<GameConfig> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Returning mock game config for:", id);
    const games = await getMockGames();
    const game = games.find((g) => g.id === id);

    if (!game) {
      throw new Error(`Game ${id} not found`);
    }

    const mockSizes: Record<string, number> = {
      "1": 75 * 1024 * 1024 * 1024,
      "2": 150 * 1024 * 1024 * 1024,
      "3": 50 * 1024 * 1024 * 1024,
      "11": 150 * 1024 * 1024 * 1024,
    };

    return {
      id: game.id,
      title: game.title,
      store: game.store,
      storeId: game.storeId || game.id,
      installPath: game.installed ? `/home/user/Games/${game.title}` : null,
      customExecutable: game.customExecutable || null,
      winePrefix:
        game.store === "epic" ? `/home/user/.local/share/pixxiden/prefixes/${game.id}` : null,
      wineVersion: game.store === "epic" ? "ge-proton-8-32" : null,
      installed: game.installed || false,
      downloadSize: mockSizes[game.id] || 30 * 1024 * 1024 * 1024,
      version: "1.0.0",
    };
  }

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
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Updating custom executable for:", gameId, customExecutable);
    return;
  }

  try {
    await invoke("update_game_custom_executable", { gameId, customExecutable });
  } catch (error) {
    console.error("Failed to update custom executable:", error);
    throw error;
  }
}
