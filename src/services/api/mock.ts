/**
 * Mock data utilities for E2E and development
 */
import type { Game } from "@/types";

let mockGamesData: Game[] | null = null;

// Enrich raw mock games with realistic test data
const enrichMockGames = (games: unknown[]): Game[] => {
  const enrichedData: Record<string, Partial<Game>> = {
    "1": {
      genres: ["Adventure", "Indie", "Simulation"],
      developer: "Black Salt Games",
      publisher: "Team17",
      releaseDate: "2023-03-30",
      metacriticScore: 84,
      igdbRating: 82,
      hltbMain: 12,
      hltbMainExtra: 18,
      hltbComplete: 25,
      protonTier: "platinum",
      achievementsTotal: 45,
      achievementsUnlocked: 28,
      description: "A single-player fishing adventure with a sinister undercurrent.",
    },
    "2": {
      genres: ["Shooter", "Action"],
      developer: "Infinity Ward",
      publisher: "Activision",
      releaseDate: "2003-10-29",
      metacriticScore: 91,
      igdbRating: 88,
      hltbMain: 7,
      hltbMainExtra: 9,
      hltbComplete: 12,
      protonTier: "gold",
      achievementsTotal: 36,
      achievementsUnlocked: 0,
      description: "Call of Duty delivers the gritty realism of World War II.",
    },
    "3": {
      genres: ["Shooter", "Battle Royale", "Action"],
      developer: "Epic Games",
      publisher: "Epic Games",
      releaseDate: "2017-07-25",
      metacriticScore: 81,
      igdbRating: 76,
      hltbMain: 0,
      hltbMainExtra: 0,
      hltbComplete: 0,
      protonTier: "borked",
      achievementsTotal: 0,
      achievementsUnlocked: 0,
      description: "The action building game where you team up with other players.",
    },
    "4": {
      genres: ["Action", "Adventure", "Multiplayer"],
      developer: "Rare",
      publisher: "Xbox Game Studios",
      releaseDate: "2018-03-20",
      metacriticScore: 69,
      igdbRating: 71,
      hltbMain: 15,
      hltbMainExtra: 45,
      hltbComplete: 120,
      protonTier: "silver",
      achievementsTotal: 189,
      achievementsUnlocked: 42,
      description: "A pirate adventure game via a pirate ship from first-person perspective.",
    },
    "7": {
      genres: ["Action", "Adventure", "Shooter"],
      developer: "Rockstar Games",
      publisher: "Rockstar Games",
      releaseDate: "2018-10-26",
      metacriticScore: 97,
      igdbRating: 93,
      hltbMain: 50,
      hltbMainExtra: 79,
      hltbComplete: 173,
      protonTier: "gold",
      achievementsTotal: 59,
      achievementsUnlocked: 35,
      description: "America, 1899. The end of the Wild West era has begun.",
    },
  };

  return games.map((game: unknown) => {
    const g = game as Game;
    const enrichment = enrichedData[g.id] || {};
    return {
      ...g,
      genres: enrichment.genres ?? [],
      developer: enrichment.developer,
      publisher: enrichment.publisher,
      releaseDate: enrichment.releaseDate,
      description: enrichment.description ?? g.description,
      metacriticScore: enrichment.metacriticScore,
      igdbRating: enrichment.igdbRating,
      hltbMain: enrichment.hltbMain,
      hltbMainExtra: enrichment.hltbMainExtra,
      hltbComplete: enrichment.hltbComplete,
      protonTier: enrichment.protonTier,
      achievementsTotal: enrichment.achievementsTotal,
      achievementsUnlocked: enrichment.achievementsUnlocked,
      playTimeMinutes: g.playTimeMinutes ?? 0,
      createdAt: g.createdAt ?? new Date().toISOString(),
      updatedAt: g.updatedAt ?? new Date().toISOString(),
    };
  });
};

export const getMockGames = async (): Promise<Game[]> => {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { __MOCK_GAMES__?: unknown[] }).__MOCK_GAMES__
  ) {
    console.log("🎮 [MOCK] Using window.__MOCK_GAMES__");
    return enrichMockGames((window as unknown as { __MOCK_GAMES__: unknown[] }).__MOCK_GAMES__);
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("PIXXIDEN_MOCK_GAMES");
      if (stored) {
        const games = JSON.parse(stored);
        console.log("🎮 [MOCK] Using localStorage PIXXIDEN_MOCK_GAMES:", games.length, "games");
        return enrichMockGames(games);
      }
    } catch (e) {
      console.error("🎮 [MOCK] Failed to parse localStorage mock games:", e);
    }
  }

  if (mockGamesData !== null) {
    return mockGamesData;
  }

  // Dynamic import for development/test mode
  try {
    const module = await import("../../../e2e/fixtures/mockGames");
    mockGamesData = enrichMockGames(module.mockGames);
    return mockGamesData;
  } catch {
    return [];
  }
};
