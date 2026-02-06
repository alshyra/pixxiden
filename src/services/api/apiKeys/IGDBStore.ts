/**
 * IGDB API Key Store
 * Handles OAuth token generation and management
 */
import { fetch } from "@tauri-apps/plugin-http";
import type { IApiKeyStore } from "./IApiKeyStore";
import type { ApiKeyTestResult } from "./types";

interface TwitchOAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class IGDBStore implements IApiKeyStore {
  getDisplayName(): string {
    return "IGDB";
  }

  getRequiredFields(): string[] {
    return ["clientId", "clientSecret"];
  }

  /**
   * Get an access token from Twitch OAuth
   */
  async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TwitchOAuthResponse;
    return data.access_token;
  }

  async test(credentials: Record<string, string>): Promise<ApiKeyTestResult> {
    const { clientId, clientSecret } = credentials;

    if (!clientId || !clientSecret) {
      return {
        valid: false,
        message: "Client ID and Client Secret are required",
      };
    }

    try {
      // Step 1: Get access token
      let accessToken: string;
      try {
        accessToken = await this.getAccessToken(clientId, clientSecret);
      } catch (error) {
        return {
          valid: false,
          message: `Failed to get access token: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Step 2: Test the access token with IGDB API
      const response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        body: "fields name; limit 1;",
      });

      if (response.ok) {
        return {
          valid: true,
          message: "Credentials are valid",
        };
      } else if (response.status === 401) {
        return {
          valid: false,
          message: "Invalid credentials (unauthorized)",
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