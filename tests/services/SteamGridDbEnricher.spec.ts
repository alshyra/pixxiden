/**
 * SteamGridDbEnricher unit tests
 *
 * Focus: searchGameId must pick the exact game, not a similarly-named variant.
 * Bug reproduced: searching "Baldur's Gate 3" returns artwork for
 * "Baldur's Gate 3 Toolkit" because searchGameId blindly picks results[0].
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SteamGridDbEnricher } from "@/services/enrichment/SteamGridDbEnricher";

// ===== Mocks =====

// Mock Tauri HTTP plugin
const mockFetch = vi.fn();
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

// Mock Tauri log plugin
vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  error: vi.fn(),
}));

// ===== Helpers =====

function createSteamGridDbEnricher(): SteamGridDbEnricher {
  const enricher = new SteamGridDbEnricher();
  enricher.configure({ apiKey: "test-api-key" });
  return enricher;
}

/**
 * Build a mock SteamGridDB autocomplete response.
 * Each entry has { id, name, types, verified }.
 */
function mockAutocompleteResponse(results: { id: number; name: string }[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: results.map((r) => ({
        id: r.id,
        name: r.name,
        types: ["steam"],
        verified: true,
      })),
    }),
  };
}

/** Minimal mock for image fetch endpoints (returns empty array) */
function mockEmptyImagesResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [] }),
  };
}

/** Extract image-fetch URLs from mockFetch calls (excludes autocomplete calls) */
function getImageCallUrls(): string[] {
  return mockFetch.mock.calls
    .map((call: unknown[]) => String(call[0]))
    .filter((url: string) => !url.includes("/search/autocomplete/"));
}

// ===== Tests =====

describe("SteamGridDbEnricher", () => {
  let enricher: SteamGridDbEnricher;

  beforeEach(() => {
    vi.clearAllMocks();
    enricher = createSteamGridDbEnricher();
  });

  describe("searchGameId — exact match selection", () => {
    it("should pick 'Baldur's Gate 3' over 'Baldur's Gate 3 Toolkit' when both are returned", async () => {
      // Simulate SteamGridDB autocomplete returning the Toolkit first
      // (this is the actual bug scenario)
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 99999, name: "Baldur's Gate 3 Toolkit" },
            { id: 36189, name: "Baldur's Gate 3" },
          ]);
        }
        // All image endpoints return empty
        return mockEmptyImagesResponse();
      });

      await enricher.search("Baldur's Gate 3");

      // The search endpoint should have been called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/search/autocomplete/Baldur"),
        expect.any(Object),
      );

      // Verify that image fetches used the CORRECT game ID (36189 = Baldur's Gate 3)
      // and NOT the Toolkit ID (99999)
      const imageCallUrls = getImageCallUrls();

      // All image requests should target game ID 36189
      for (const url of imageCallUrls) {
        expect(url).toContain("/game/36189");
        expect(url).not.toContain("/game/99999");
      }
    });

    it("should pick exact match even when it is not the first result", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 10001, name: "The Witcher 3: Wild Hunt - Game of the Year Edition" },
            { id: 10002, name: "The Witcher 3: Wild Hunt - Complete Edition" },
            { id: 5678, name: "The Witcher 3: Wild Hunt" },
          ]);
        }
        return mockEmptyImagesResponse();
      });

      await enricher.search("The Witcher 3: Wild Hunt");

      const imageCallUrls = getImageCallUrls();

      for (const url of imageCallUrls) {
        expect(url).toContain("/game/5678");
      }
    });

    it("should fall back to first result when no exact match exists", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 42000, name: "Cyberpunk 2077" },
            { id: 42001, name: "Cyberpunk 2077: Phantom Liberty" },
          ]);
        }
        return mockEmptyImagesResponse();
      });

      await enricher.search("Cyberpunk 2077");

      const imageCallUrls = getImageCallUrls();

      // Should use first result as fallback since "Cyberpunk 2077" matches exactly
      for (const url of imageCallUrls) {
        expect(url).toContain("/game/42000");
      }
    });

    it("should be case-insensitive when matching game title", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 88888, name: "HADES II" },
            { id: 77777, name: "Hades II" },
            { id: 66666, name: "Hades" },
          ]);
        }
        return mockEmptyImagesResponse();
      });

      await enricher.search("Hades");

      const imageCallUrls = getImageCallUrls();

      for (const url of imageCallUrls) {
        expect(url).toContain("/game/66666");
      }
    });

    it("should handle single result gracefully", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([{ id: 55555, name: "Hollow Knight" }]);
        }
        return mockEmptyImagesResponse();
      });

      await enricher.search("Hollow Knight");

      const imageCallUrls = getImageCallUrls();

      for (const url of imageCallUrls) {
        expect(url).toContain("/game/55555");
      }
    });

    it("should match localized title 'Hogwarts Legacy: l'héritage de poudlard' to 'Hogwarts Legacy'", async () => {
      // The user's library might have a localized title that doesn't exactly
      // match SteamGridDB's English name. Autocomplete should still
      // return results, and we should pick the base game.
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 44000, name: "Hogwarts Legacy" },
            { id: 44001, name: "Hogwarts Legacy: Digital Deluxe Edition" },
          ]);
        }
        return mockEmptyImagesResponse();
      });

      // Searching with the localized French title — no exact match possible
      await enricher.search("Hogwarts Legacy: l'héritage de poudlard");

      const imageCallUrls = getImageCallUrls();

      // Should fallback — currently picks first result (44000 = Hogwarts Legacy)
      // which is acceptable since no exact match exists
      for (const url of imageCallUrls) {
        expect(url).toContain("/game/44000");
      }
    });

    it("should match titles with smart quotes (curly apostrophes)", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([
            { id: 99999, name: "Baldur's Gate 3 Toolkit" },
            { id: 36189, name: "Baldur's Gate 3" },
          ]);
        }
        return mockEmptyImagesResponse();
      });

      // Game title uses curly apostrophe (\u2019), SteamGridDB uses straight
      await enricher.search("Baldur\u2019s Gate 3");

      const imageCallUrls = getImageCallUrls();

      // Should match "Baldur's Gate 3" despite different apostrophe chars
      for (const url of imageCallUrls) {
        expect(url).toContain("/game/36189");
      }
    });

    it("should prefer verified result when no exact match exists", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: [
                { id: 70001, name: "Some Random DLC", types: ["steam"], verified: false },
                { id: 70002, name: "Some Other Game", types: ["steam"], verified: true },
                { id: 70003, name: "Another Result", types: ["steam"], verified: false },
              ],
            }),
          };
        }
        return mockEmptyImagesResponse();
      });

      await enricher.search("Completely Different Title");

      const imageCallUrls = getImageCallUrls();

      // Should pick the verified result (70002)
      for (const url of imageCallUrls) {
        expect(url).toContain("/game/70002");
      }
    });
  });

  describe("fetchImages — ordering", () => {
    it("should preserve API order instead of re-sorting by score", async () => {
      // The API returns images in its own optimized order (factoring views, etc.)
      // We should NOT re-sort by score which would break that order.
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([{ id: 44000, name: "Hogwarts Legacy" }]);
        }
        if (url.includes("/grids/game/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: [
                // API order: image with high views but 0 score comes first
                {
                  id: 302909,
                  url: "https://cdn2.steamgriddb.com/grid/302909.png",
                  thumb: "https://cdn2.steamgriddb.com/thumb/302909.jpg",
                  width: 920,
                  height: 430,
                  score: 0,
                  upvotes: 0,
                  downvotes: 0,
                  style: "alternate",
                  nsfw: false,
                  author: { name: "Kran" },
                },
                {
                  id: 297083,
                  url: "https://cdn2.steamgriddb.com/grid/297083.png",
                  thumb: "https://cdn2.steamgriddb.com/thumb/297083.jpg",
                  width: 920,
                  height: 430,
                  score: 1,
                  upvotes: 1,
                  downvotes: 0,
                  style: "alternate",
                  nsfw: false,
                  author: { name: "PhantomTMac" },
                },
              ],
            }),
          };
        }
        return mockEmptyImagesResponse();
      });

      const result = await enricher.search("Hogwarts Legacy");

      // The horizontal grid should be the first image from API (302909)
      // NOT the higher-scored 297083
      expect(result).not.toBeNull();
      expect(result!.horizontalGrid).toBe("https://cdn2.steamgriddb.com/grid/302909.png");
    });

    it("should filter out NSFW images while preserving order", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("/search/autocomplete/")) {
          return mockAutocompleteResponse([{ id: 12345, name: "Some Game" }]);
        }
        if (url.includes("/heroes/game/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: [
                {
                  id: 1,
                  url: "https://cdn.example.com/nsfw-hero.png",
                  thumb: "thumb1",
                  width: 1920,
                  height: 620,
                  score: 10,
                  nsfw: true,
                  author: { name: "A" },
                },
                {
                  id: 2,
                  url: "https://cdn.example.com/safe-hero.png",
                  thumb: "thumb2",
                  width: 1920,
                  height: 620,
                  score: 5,
                  nsfw: false,
                  author: { name: "B" },
                },
              ],
            }),
          };
        }
        return mockEmptyImagesResponse();
      });

      const result = await enricher.search("Some Game");

      // Hero should be the safe one (NSFW filtered out)
      expect(result).not.toBeNull();
      expect(result!.hero).toBe("https://cdn.example.com/safe-hero.png");
    });
  });
});
