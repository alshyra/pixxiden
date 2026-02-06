/**
 * Common types for API Keys management
 */

export interface ApiKeysConfig {
  steamgriddbApiKey: string | null;
  igdbClientId: string | null;
  igdbClientSecret: string | null;
  igdbAccessToken: string | null;
  igdbTokenExpiresAt: number | null;
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
  valid: boolean;
  message: string | null;
}

export interface ApiKeyTestResults {
  steamgriddbValid: boolean;
  steamgriddbMessage: string | null;
  igdbValid: boolean;
  igdbMessage: string | null;
  steamValid: boolean;
  steamMessage: string | null;
}

// Internal interface for file storage
export interface StoredApiKeysConfig {
  steamgriddb_api_key?: string | null;
  igdb_client_id?: string | null;
  igdb_client_secret?: string | null;
  igdb_access_token?: string | null;
  igdb_token_expires_at?: number | null;
  steam_api_key?: string | null;
  steam_id?: string | null;
  setup_completed?: boolean;
}