/**
 * Base interface for API key stores
 */
import type { ApiKeyTestResult } from "./types";

export interface IApiKeyStore {
  /**
   * Test if the API credentials are valid
   */
  test(credentials: Record<string, string>): Promise<ApiKeyTestResult>;

  /**
   * Get the required credential field names for this store
   */
  getRequiredFields(): string[];

  /**
   * Get the display name of this API service
   */
  getDisplayName(): string;
}