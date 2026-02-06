/**
 * SteamGridDB API Key Store
 */
import { fetch } from "@tauri-apps/plugin-http";
import type { IApiKeyStore } from "./IApiKeyStore";
import type { ApiKeyTestResult } from "./types";

export class SteamGridDBStore implements IApiKeyStore {
  getDisplayName(): string {
    return "SteamGridDB";
  }

  getRequiredFields(): string[] {
    return ["apiKey"];
  }

  async test(credentials: Record<string, string>): Promise<ApiKeyTestResult> {
    const { apiKey } = credentials;

    if (!apiKey) {
      return {
        valid: false,
        message: "API key is required",
      };
    }

    try {
      // Test with a known game ID (Portal 2)
      const response = await fetch("https://www.steamgriddb.com/api/v2/games/id/1873", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return {
          valid: true,
          message: "API key is valid",
        };
      } else if (response.status === 401) {
        return {
          valid: false,
          message: "Invalid API key (unauthorized)",
        };
      } else {
        return {
          valid: false,
          message: `API error: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}