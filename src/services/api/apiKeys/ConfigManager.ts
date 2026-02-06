/**
 * Configuration file manager
 * Handles reading and writing API keys to disk
 */
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import type { ApiKeysConfig, StoredApiKeysConfig } from "./types";

const CONFIG_FILENAME = "api_keys.json";

/**
 * Get the config file path
 */
async function getConfigPath(): Promise<string> {
  const configDir = await appConfigDir();
  console.log("📄 [configManager] appConfigDir:", configDir);
  const fullPath = await join(configDir, CONFIG_FILENAME);
  console.log("📄 [configManager] Full config path:", fullPath);
  return fullPath;
}

/**
 * Default configuration
 */
function getDefaultConfig(): ApiKeysConfig {
  return {
    steamgriddbApiKey: null,
    igdbClientId: null,
    igdbClientSecret: null,
    igdbAccessToken: null,
    igdbTokenExpiresAt: null,
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
    igdbAccessToken: stored.igdb_access_token || null,
    igdbTokenExpiresAt: stored.igdb_token_expires_at || null,
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
    igdb_access_token: config.igdbAccessToken,
    igdb_token_expires_at: config.igdbTokenExpiresAt,
    steam_api_key: config.steamApiKey,
    steam_id: config.steamId,
    setup_completed: config.setupCompleted,
  };
}

/**
 * Load API keys config from file
 */
export async function loadConfig(): Promise<ApiKeysConfig> {
  try {
    const configPath = await getConfigPath();
    console.log("📄 [configManager] Config path:", configPath);

    const fileExists = await exists(configPath);
    console.log("📄 [configManager] File exists check:", fileExists);

    if (!fileExists) {
      console.info("📄 [configManager] API keys config file not found, using defaults");
      return getDefaultConfig();
    }

    const content = await readTextFile(configPath);
    const stored: StoredApiKeysConfig = JSON.parse(content);
    console.info("📄 [configManager] Loaded API keys config successfully");

    return convertToApiConfig(stored);
  } catch (error) {
    console.error("📄 [configManager] Failed to load API keys:", error);
    return getDefaultConfig();
  }
}

/**
 * Save API keys config to file
 */
export async function saveConfig(config: ApiKeysConfig): Promise<void> {
  try {
    const configPath = await getConfigPath();
    console.log("📝 [configManager] Config path:", configPath);

    // Recompute flags before saving
    const stored = convertToStoredConfig(config);
    const flags = computeHasFlags(stored);
    config.hasSteamgriddb = flags.hasSteamgriddb;
    config.hasIgdb = flags.hasIgdb;
    config.hasSteam = flags.hasSteam;

    // Write to file
    const content = JSON.stringify(convertToStoredConfig(config), null, 2);
    await writeTextFile(configPath, content);

    console.info("📝 [configManager] Saved API keys config successfully");
  } catch (error) {
    console.error("📝 [configManager] Failed to save API keys:", error);
    throw error;
  }
}