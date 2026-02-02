/**
 * ProtonDbEnricher - Fetches ProtonDB compatibility ratings for Steam games
 * Free API, no authentication required
 */

import { fetch } from "@tauri-apps/plugin-http";
import type { ProtonDbData } from "./EnrichmentService";

interface ProtonDbResponse {
  tier?: string;
  confidence?: string;
  score?: number;
  trendingTier?: string;
  total?: number;
  bestReportedTier?: string;
}

export class ProtonDbEnricher {
  private static readonly API_URL = "https://www.protondb.com/api/v1/reports/summaries";

  /**
   * Search for a Steam game's ProtonDB rating by Steam App ID
   */
  async searchByAppId(steamAppId: number): Promise<ProtonDbData | null> {
    try {
      console.log(`📡 ProtonDB: Searching for appId ${steamAppId}`);

      const response = await fetch(`${ProtonDbEnricher.API_URL}/${steamAppId}.json`, {
        method: "GET",
        headers: {
          "User-Agent": "Pixxiden/1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`📡 ProtonDB: No data for appId ${steamAppId}`);
          return null;
        }
        throw new Error(`ProtonDB API error: ${response.status}`);
      }

      const data: ProtonDbResponse = await response.json();

      if (!data.tier) {
        console.log(`📡 ProtonDB: No tier data for appId ${steamAppId}`);
        return null;
      }

      console.log(`✅ ProtonDB: Found tier "${data.tier}" for appId ${steamAppId}`);

      return this.mapToProtonDbData(data);
    } catch (error) {
      console.error(`❌ ProtonDB error for appId ${steamAppId}:`, error);
      throw error;
    }
  }

  /**
   * Search by game title (fallback if Steam App ID not available)
   * Note: ProtonDB primarily uses Steam App IDs, so this is less reliable
   */
  async searchByTitle(title: string): Promise<ProtonDbData | null> {
    console.warn(
      `⚠️ ProtonDB: Searching by title "${title}" is not officially supported. Use Steam App ID instead.`,
    );
    // ProtonDB doesn't have a title search API
    // Would need to scrape or use a different approach
    return null;
  }

  /**
   * Map ProtonDB response to our data structure
   */
  private mapToProtonDbData(data: ProtonDbResponse): ProtonDbData {
    return {
      tier: this.normalizeTier(data.tier || data.bestReportedTier || "unknown"),
      confidence: data.confidence || "unknown",
      trendingTier: data.trendingTier,
      score: data.score,
    };
  }

  /**
   * Normalize ProtonDB tier to consistent format
   */
  private normalizeTier(tier: string): string {
    // ProtonDB tiers: platinum, gold, silver, bronze, borked, pending
    const normalized = tier.toLowerCase();

    const validTiers = ["platinum", "gold", "silver", "bronze", "borked", "pending", "unknown"];

    if (validTiers.includes(normalized)) {
      return normalized;
    }

    return "unknown";
  }

  /**
   * Get tier color for UI display
   */
  getTierColor(tier: string): string {
    const colors: Record<string, string> = {
      platinum: "#b4c7dc",
      gold: "#f4e500",
      silver: "#c0c0c0",
      bronze: "#cd7f32",
      borked: "#ff0000",
      pending: "#888888",
      unknown: "#666666",
    };

    return colors[tier.toLowerCase()] || colors.unknown;
  }

  /**
   * Get tier description for UI display
   */
  getTierDescription(tier: string): string {
    const descriptions: Record<string, string> = {
      platinum: "Perfect - Runs perfectly out of the box",
      gold: "Great - Runs perfectly after tweaks",
      silver: "Good - Runs with minor issues",
      bronze: "Playable - Runs but with significant issues",
      borked: "Broken - Doesn't run at all",
      pending: "Pending - Not enough reports yet",
      unknown: "Unknown - No data available",
    };

    return descriptions[tier.toLowerCase()] || descriptions.unknown;
  }

  /**
   * Check if a tier is considered "playable"
   */
  isPlayable(tier: string): boolean {
    const playableTiers = ["platinum", "gold", "silver", "bronze"];
    return playableTiers.includes(tier.toLowerCase());
  }

  /**
   * Get numeric score from tier (for sorting)
   */
  getTierScore(tier: string): number {
    const scores: Record<string, number> = {
      platinum: 100,
      gold: 80,
      silver: 60,
      bronze: 40,
      borked: 0,
      pending: -1,
      unknown: -2,
    };

    return scores[tier.toLowerCase()] || -2;
  }
}
