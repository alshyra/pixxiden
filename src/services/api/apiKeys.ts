/**
 * API Keys management functions
 */
import { invoke, isMockMode } from "./core";

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

export async function needsSetup(): Promise<boolean> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Checking if setup needed");
    try {
      return localStorage.getItem("PIXXIDEN_SETUP_COMPLETED") !== "true";
    } catch {
      return false;
    }
  }

  try {
    return await invoke<boolean>("needs_setup");
  } catch (error) {
    console.error("Failed to check setup status:", error);
    return false;
  }
}

export async function getApiKeys(): Promise<ApiKeysConfig> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Getting mock API keys");
    return {
      steamgriddbApiKey: null,
      igdbClientId: null,
      igdbClientSecret: null,
      steamApiKey: null,
      steamId: null,
      setupCompleted: localStorage.getItem("PIXXIDEN_SETUP_COMPLETED") === "true",
      hasSteamgriddb: false,
      hasIgdb: false,
      hasSteam: false,
    };
  }

  try {
    return await invoke<ApiKeysConfig>("get_api_keys");
  } catch (error) {
    console.error("Failed to get API keys:", error);
    throw error;
  }
}

export async function saveApiKeys(request: ApiKeysUpdateRequest): Promise<ApiKeysConfig> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Saving mock API keys:", request);
    if (request.markSetupCompleted) {
      localStorage.setItem("PIXXIDEN_SETUP_COMPLETED", "true");
    }
    return getApiKeys();
  }

  try {
    return await invoke<ApiKeysConfig>("save_api_keys", { request });
  } catch (error) {
    console.error("Failed to save API keys:", error);
    throw error;
  }
}

export async function skipSetup(): Promise<void> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Skipping setup");
    localStorage.setItem("PIXXIDEN_SETUP_COMPLETED", "true");
    return;
  }

  try {
    await invoke("skip_setup");
  } catch (error) {
    console.error("Failed to skip setup:", error);
    throw error;
  }
}

export async function testApiKeys(request: ApiKeysUpdateRequest): Promise<ApiKeyTestResult> {
  if (isMockMode()) {
    console.log("🎮 [MOCK MODE] Testing mock API keys");
    return {
      steamgriddbValid: !!request.steamgriddbApiKey,
      steamgriddbMessage: request.steamgriddbApiKey ? "Mock: Valid" : null,
      igdbValid: !!(request.igdbClientId && request.igdbClientSecret),
      igdbMessage: request.igdbClientId && request.igdbClientSecret ? "Mock: Valid" : null,
      steamValid: !!(request.steamApiKey && request.steamId),
      steamMessage: request.steamApiKey && request.steamId ? "Mock: Valid" : null,
    };
  }

  try {
    return await invoke<ApiKeyTestResult>("test_api_keys", { request });
  } catch (error) {
    console.error("Failed to test API keys:", error);
    throw error;
  }
}
