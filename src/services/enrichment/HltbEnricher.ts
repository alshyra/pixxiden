/**
 * HltbEnricher - Fetches game completion time data from HowLongToBeat
 * Uses the howlongtobeat npm package for easy API access
 */

import { fetch } from "@tauri-apps/plugin-http";
import type { HltbData } from "./EnrichmentService";

interface HltbSearchResult {
  game_id: number;
  game_name: string;
  comp_main?: number;
  comp_plus?: number;
  comp_100?: number;
  comp_all?: number;
  similarity?: number;
}

export class HltbEnricher {
  private static readonly API_URL = "https://howlongtobeat.com/api/search";

  /**
   * Search for a game's completion time
   */
  async search(title: string): Promise<HltbData | null> {
    try {
      console.log(`📡 HLTB: Searching for "${title}"`);

      // HowLongToBeat API expects a specific payload format
      const payload = {
        searchType: "games",
        searchTerms: title.split(" "),
        searchPage: 1,
        size: 20,
        searchOptions: {
          games: {
            userId: 0,
            platform: "",
            sortCategory: "popular",
            rangeCategory: "main",
            rangeTime: {
              min: 0,
              max: 0,
            },
            gameplay: {
              perspective: "",
              flow: "",
              genre: "",
            },
            modifier: "",
          },
          users: {
            sortCategory: "postcount",
          },
          filter: "",
          sort: 0,
          randomizer: 0,
        },
      };

      const response = await fetch(HltbEnricher.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://howlongtobeat.com",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HLTB API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log(`📡 HLTB: No results for "${title}"`);
        return null;
      }

      // Get the best match (first result is usually the best)
      const bestMatch = this.findBestMatch(title, data.data);

      if (!bestMatch) {
        return null;
      }

      console.log(`✅ HLTB: Found "${bestMatch.game_name}"`);

      return this.mapToHltbData(bestMatch);
    } catch (error) {
      console.error(`❌ HLTB error for "${title}":`, error);
      throw error;
    }
  }

  /**
   * Find the best match from search results
   */
  private findBestMatch(searchTitle: string, results: any[]): HltbSearchResult | null {
    if (results.length === 0) return null;

    const normalizedSearch = this.normalizeTitle(searchTitle);

    // Sort by similarity score
    const scored = results
      .map((result) => ({
        ...result,
        similarity: this.calculateSimilarity(
          normalizedSearch,
          this.normalizeTitle(result.game_name),
        ),
      }))
      .filter((r) => r.similarity > 0.5) // Only keep results with >50% similarity
      .sort((a, b) => b.similarity - a.similarity);

    return scored.length > 0 ? scored[0] : null;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  /**
   * Calculate similarity between two strings (simple Levenshtein distance)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Map HLTB response to our data structure
   */
  private mapToHltbData(result: any): HltbData {
    return {
      gameplayMain: result.comp_main ? Math.round(result.comp_main / 3600) : undefined, // Convert seconds to hours
      gameplayMainExtra: result.comp_plus ? Math.round(result.comp_plus / 3600) : undefined,
      gameplayCompletionist: result.comp_100 ? Math.round(result.comp_100 / 3600) : undefined,
      gameplayAllStyles: result.comp_all ? Math.round(result.comp_all / 3600) : undefined,
    };
  }

  /**
   * Get game by HLTB ID
   */
  async getById(hltbId: number): Promise<HltbData | null> {
    try {
      const response = await fetch(`https://howlongtobeat.com/api/game/${hltbId}`, {
        method: "GET",
        headers: {
          Referer: "https://howlongtobeat.com",
        },
      });

      if (!response.ok) {
        throw new Error(`HLTB API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data) {
        return null;
      }

      return this.mapToHltbData(data.data[0]);
    } catch (error) {
      console.error(`❌ HLTB error for ID ${hltbId}:`, error);
      throw error;
    }
  }
}
