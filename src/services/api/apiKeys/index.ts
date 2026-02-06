/**
 * API Keys management service
 * Main entry point that orchestrates all API key stores
 */
import { SteamGridDBStore } from "./SteamGridDBStore";
import { IGDBStore } from "./IGDBStore";
import { SteamStore } from "./SteamStore";
import { loadConfig, saveConfig } from "./ConfigManager";
import type { ApiKeysConfig, ApiKeysUpdateRequest, ApiKeyTestResults } from "./types";

// Re-export types for external use
export type { ApiKeysConfig, ApiKeysUpdateRequest, ApiKeyTestResults } from "./types";
export type { ApiKeyTestResult } from "./types";

// Initialize stores
const steamGridDBStore = new SteamGridDBStore();
const igdbStore = new IGDBStore();
const steamStore = new SteamStore();

/**
 * Load API keys config from file
 */
export async function getApiKeys(): Promise<ApiKeysConfig> {
  return await loadConfig();
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
    const currentConfig = await getApiKeys();
    console.log("📝 [apiKeys] Current config loaded");

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

    await saveConfig(updated);

    console.info("📝 [apiKeys] Saved API keys config successfully");
    return updated;
  } catch (error) {
    console.error("📝 [apiKeys] Failed to save API keys:", error);
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
 */
export async function testApiKeys(request: ApiKeysUpdateRequest): Promise<ApiKeyTestResults> {
  const results: ApiKeyTestResults = {
    steamgriddbValid: false,
    steamgriddbMessage: null,
    igdbValid: false,
    igdbMessage: null,
    steamValid: false,
    steamMessage: null,
  };

  // Test SteamGridDB
  if (request.steamgriddbApiKey) {
    const result = await steamGridDBStore.test({
      apiKey: request.steamgriddbApiKey,
    });
    results.steamgriddbValid = result.valid;
    results.steamgriddbMessage = result.message;
  }

  // Test IGDB
  if (request.igdbClientId && request.igdbClientSecret) {
    const result = await igdbStore.test({
      clientId: request.igdbClientId,
      clientSecret: request.igdbClientSecret,
    });
    results.igdbValid = result.valid;
    results.igdbMessage = result.message;

    // If valid, get and store the access token
    if (result.valid) {
      try {
        const accessToken = await igdbStore.getAccessToken(
          request.igdbClientId,
          request.igdbClientSecret,
        );
        const config = await getApiKeys();
        config.igdbAccessToken = accessToken;
        config.igdbTokenExpiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days
        await saveConfig(config);
        console.info("📝 [apiKeys] Stored IGDB access token");
      } catch (error) {
        console.error("Failed to store IGDB access token:", error);
      }
    }
  }

  // Test Steam API
  if (request.steamApiKey && request.steamId) {
    const result = await steamStore.test({
      apiKey: request.steamApiKey,
      steamId: request.steamId,
    });
    results.steamValid = result.valid;
    results.steamMessage = result.message;
  }

  console.info("API keys test completed", results);
  return results;
}

/**
 * Get a valid IGDB access token (refreshes if expired)
 */
export async function getIGDBAccessToken(): Promise<string | null> {
  const config = await getApiKeys();

  if (!config.igdbClientId || !config.igdbClientSecret) {
    return null;
  }

  // Check if token exists and is not expired
  if (
    config.igdbAccessToken &&
    config.igdbTokenExpiresAt &&
    config.igdbTokenExpiresAt > Date.now()
  ) {
    return config.igdbAccessToken;
  }

  // Token expired or doesn't exist, get a new one
  try {
    const accessToken = await igdbStore.getAccessToken(
      config.igdbClientId,
      config.igdbClientSecret,
    );
    config.igdbAccessToken = accessToken;
    config.igdbTokenExpiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days
    await saveConfig(config);
    console.info("📝 [apiKeys] Refreshed IGDB access token");
    return accessToken;
  } catch (error) {
    console.error("Failed to refresh IGDB access token:", error);
    return null;
  }
}
