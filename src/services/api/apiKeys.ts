/**
 * API Keys management service
 * Uses TypeScript with @tauri-apps/plugin-fs for file operations
 * Only delegates to Rust for external API testing (IGDB, SteamGridDB)
 */
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

const CONFIG_FILENAME = "api_keys.json";

export interface ApiKeysConfig {
  steamgriddbApiKey: string | null;
  igdbClientId: string | null;
  igdbClientSecret: string | null;
  steamApiKey: string | null;
  steamId: string | null;
  setupCompleted: boolean;
  hasSteamgriddb: boolean;
  hasIgdb: boolean;
  hasSteam: boolean;
}

export interface ApiKeysUpdateRequest {
  steamgriddbApiKey?: string | null;
  igdbClientId?: string | null;
  igdbClientSecret?: string | null;
  steamApiKey?: string | null;
  steamId?: string | null;
  markSetupCompleted?: boolean;
}

export interface ApiKeyTestResult {
  steamgriddbValid: boolean;
  steamgriddbMessage: string | null;
  igdbValid: boolean;
  igdbMessage: string | null;
  steamValid: boolean;
  steamMessage: string | null;
}

// Internal interface for file storage
interface StoredApiKeysConfig {
  steamgriddb_api_key?: string | null;
  igdb_client_id?: string | null;
  igdb_client_secret?: string | null;
  steam_api_key?: string | null;
  steam_id?: string | null;
  setup_completed?: boolean;
}

/**
 * Get the config file path
 */
async function getConfigPath(): Promise<string> {
  const configDir = await appConfigDir();
  return await join(configDir, CONFIG_FILENAME);
}

/**
 * Default configuration
 */
function getDefaultConfig(): ApiKeysConfig {
  return {
    steamgriddbApiKey: null,
    igdbClientId: null,
    igdbClientSecret: null,
    steamApiKey: null,
    steamId: null,
    setupCompleted: false,
    hasSteamgriddb: false,
    hasIgdb: false,
    hasSteam: false,
  };
}

/**
 * Check if a config has the specified API key
 */
function computeHasFlags(config: StoredApiKeysConfig): {
  hasSteamgriddb: boolean;
  hasIgdb: boolean;
  hasSteam: boolean;
} {
  const hasSteamgriddb = !!config.steamgriddb_api_key && config.steamgriddb_api_key.length > 0;
  const hasIgdb =
    !!config.igdb_client_id &&
    config.igdb_client_id.length > 0 &&
    !!config.igdb_client_secret &&
    config.igdb_client_secret.length > 0;
  const hasSteam =
    !!config.steam_api_key &&
    config.steam_api_key.length > 0 &&
    !!config.steam_id &&
    config.steam_id.length > 0;

  return { hasSteamgriddb, hasIgdb, hasSteam };
}

/**
 * Convert stored config (snake_case) to API config (camelCase)
 */
function convertToApiConfig(stored: StoredApiKeysConfig): ApiKeysConfig {
  const flags = computeHasFlags(stored);
  return {
    steamgriddbApiKey: stored.steamgriddb_api_key || null,
    igdbClientId: stored.igdb_client_id || null,
    igdbClientSecret: stored.igdb_client_secret || null,
    steamApiKey: stored.steam_api_key || null,
    steamId: stored.steam_id || null,
    setupCompleted: stored.setup_completed || false,
    hasSteamgriddb: flags.hasSteamgriddb,
    hasIgdb: flags.hasIgdb,
    hasSteam: flags.hasSteam,
  };
}

/**
 * Convert API config (camelCase) to stored config (snake_case)
 */
function convertToStoredConfig(config: ApiKeysConfig): StoredApiKeysConfig {
  return {
    steamgriddb_api_key: config.steamgriddbApiKey,
    igdb_client_id: config.igdbClientId,
    igdb_client_secret: config.igdbClientSecret,
    steam_api_key: config.steamApiKey,
    steam_id: config.steamId,
    setup_completed: config.setupCompleted,
  };
}

/**
 * Load API keys config from file
 */
export async function getApiKeys(): Promise<ApiKeysConfig> {
  try {
    const configPath = await getConfigPath();
    const fileExists = await exists(configPath);

    if (!fileExists) {
      console.info("API keys config file not found, using defaults");
      return getDefaultConfig();
    }

    const content = await readTextFile(configPath);
    const stored: StoredApiKeysConfig = JSON.parse(content);
    console.info("Loaded API keys config successfully");

    return convertToApiConfig(stored);
  } catch (error) {
    console.error("Failed to load API keys:", error);
    return getDefaultConfig();
  }
}

/**
 * Check if setup has been completed
 */
export async function needsSetup(): Promise<boolean> {
  try {
    const config = await getApiKeys();
    return !config.setupCompleted;
  } catch (error) {
    console.error("Failed to check setup status:", error);
    return true; // Default to true (setup needed) on error
  }
}

/**
 * Save API keys config to file
 */
export async function saveApiKeys(request: ApiKeysUpdateRequest): Promise<ApiKeysConfig> {
  try {
    const configPath = await getConfigPath();
    const currentConfig = await getApiKeys();

    // Apply updates
    const updated: ApiKeysConfig = {
      ...currentConfig,
      ...(request.steamgriddbApiKey !== undefined && {
        steamgriddbApiKey: request.steamgriddbApiKey,
      }),
      ...(request.igdbClientId !== undefined && {
        igdbClientId: request.igdbClientId,
      }),
      ...(request.igdbClientSecret !== undefined && {
        igdbClientSecret: request.igdbClientSecret,
      }),
      ...(request.steamApiKey !== undefined && {
        steamApiKey: request.steamApiKey,
      }),
      ...(request.steamId !== undefined && { steamId: request.steamId }),
      ...(request.markSetupCompleted && { setupCompleted: true }),
    };

    // Write to file
    const stored = convertToStoredConfig(updated);
    const content = JSON.stringify(stored, null, 2);
    await writeTextFile(configPath, content);

    console.info("Saved API keys config successfully");
    return updated;
  } catch (error) {
    console.error("Failed to save API keys:", error);
    throw error;
  }
}

/**
 * Skip initial setup (mark as completed without providing keys)
 */
export async function skipSetup(): Promise<void> {
  try {
    await saveApiKeys({ markSetupCompleted: true });
    console.info("Setup marked as completed (skipped)");
  } catch (error) {
    console.error("Failed to skip setup:", error);
    throw error;
  }
}

/**
 * Test API keys connectivity
 * This delegates to Rust because it requires complex HTTP operations
 */
export async function testApiKeys(request: ApiKeysUpdateRequest): Promise<ApiKeyTestResult> {
  try {
    return await invoke<ApiKeyTestResult>("test_api_keys", { request });
  } catch (error) {
    console.error("Failed to test API keys:", error);
    throw error;
  }
}
