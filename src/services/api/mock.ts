/**
 * Mock data utilities for E2E and development
 */
import type { Game } from "@/types";
import { createGame } from "@/types";

let mockGamesData: Game[] | null = null;

// Enrichment data keyed by mock game id
interface MockEnrichment {
  genres?: string[];
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  metacriticScore?: number;
  igdbRating?: number;
  timeToBeatHastily?: number;
  timeToBeatNormally?: number;
  timeToBeatCompletely?: number;
  protonTier?: string;
  achievementsTotal?: number;
  achievementsUnlocked?: number;
  description?: string;
}

// Enrich raw mock games with realistic test data
const enrichMockGames = (games: unknown[]): Game[] => {
  const enrichedData: Record<string, MockEnrichment> = {
    "1": {
      genres: ["Adventure", "Indie", "Simulation"],
      developer: "Black Salt Games",
      publisher: "Team17",
      releaseDate: "2023-03-30",
      metacriticScore: 84,
      igdbRating: 82,
      timeToBeatHastily: 12,
      timeToBeatNormally: 18,
      timeToBeatCompletely: 25,
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
      timeToBeatHastily: 7,
      timeToBeatNormally: 9,
      timeToBeatCompletely: 12,
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
      timeToBeatHastily: 0,
      timeToBeatNormally: 0,
      timeToBeatCompletely: 0,
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
      timeToBeatHastily: 15,
      timeToBeatNormally: 45,
      timeToBeatCompletely: 120,
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
      timeToBeatHastily: 50,
      timeToBeatNormally: 79,
      timeToBeatCompletely: 173,
      protonTier: "gold",
      achievementsTotal: 59,
      achievementsUnlocked: 35,
      description: "America, 1899. The end of the Wild West era has begun.",
    },
  };

  return games.map((game: unknown) => {
    const raw = game as Record<string, unknown>;
    const id = String(raw.id ?? "");
    const enrichment = enrichedData[id] || {};

    const g = createGame({
      id,
      store: (raw.store as Game["storeData"]["store"]) ?? "epic",
      storeId: String(raw.storeId ?? id),
      title: String(raw.title ?? ""),
      installed: Boolean(raw.installed),
      installPath: String(raw.installPath ?? ""),
      executablePath: String(raw.executablePath ?? ""),
      developer: enrichment.developer,
      genres: enrichment.genres,
      playTimeMinutes: Number(raw.playTimeMinutes ?? raw.playTime ?? 0),
    });

    // Apply enrichment data
    g.info.publisher = enrichment.publisher ?? "";
    g.info.releaseDate = enrichment.releaseDate ?? "";
    g.info.description = enrichment.description ?? "";
    g.info.metacriticScore = enrichment.metacriticScore ?? 0;
    g.info.igdbRating = enrichment.igdbRating ?? 0;
    g.gameCompletion.timeToBeatHastily = enrichment.timeToBeatHastily ?? 0;
    g.gameCompletion.timeToBeatNormally = enrichment.timeToBeatNormally ?? 0;
    g.gameCompletion.timeToBeatCompletely = enrichment.timeToBeatCompletely ?? 0;
    g.gameCompletion.achievementsTotal = enrichment.achievementsTotal;
    g.gameCompletion.achievementsUnlocked = enrichment.achievementsUnlocked;
    g.gameCompletion.lastPlayed = String(raw.lastPlayed ?? "");
    g.protonData.protonTier = (enrichment.protonTier ??
      "pending") as Game["protonData"]["protonTier"];
    g.assets.backgroundUrl = String(raw.backgroundUrl ?? "");

    return g;
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
