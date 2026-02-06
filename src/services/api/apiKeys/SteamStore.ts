/**
 * Steam API Key Store
 */
import { fetch } from "@tauri-apps/plugin-http";
import type { IApiKeyStore } from "./IApiKeyStore";
import type { ApiKeyTestResult } from "./types";

export class SteamStore implements IApiKeyStore {
  getDisplayName(): string {
    return "Steam";
  }

  getRequiredFields(): string[] {
    return ["apiKey", "steamId"];
  }

  async test(credentials: Record<string, string>): Promise<ApiKeyTestResult> {
    const { apiKey, steamId } = credentials;

    if (!apiKey || !steamId) {
      return {
        valid: false,
        message: "API key and Steam ID are required",
      };
    }

    try {
      const response = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Check if the response contains player data
        if (data?.response?.players && data.response.players.length > 0) {
          return {
            valid: true,
            message: "API key and Steam ID are valid",
          };
        } else {
          return {
            valid: false,
            message: "Invalid Steam ID (no player found)",
          };
        }
      } else if (response.status === 401 || response.status === 403) {
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