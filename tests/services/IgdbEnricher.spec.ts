import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
const mockSearchGames = vi.fn();
const mockGetGameById = vi.fn();
const mockGetTimeToBeat = vi.fn();
const mockConfigure = vi.fn();

vi.mock("@/services/igdb", () => ({
  IgdbClient: vi.fn(function (this: any) {
    this.configure = mockConfigure;
    this.searchGames = mockSearchGames;
    this.getGameById = mockGetGameById;
    this.getTimeToBeat = mockGetTimeToBeat;
  }),
  EXTERNAL_GAME_STEAM: 1,
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("IgdbEnricher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("configure", () => {
    it("configures IGDB client with credentials", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      enricher.configure({
        clientId: "test-client-id",
        accessToken: "test-token",
      });

      expect(mockConfigure).toHaveBeenCalledWith({
        clientId: "test-client-id",
        accessToken: "test-token",
      });
    });
  });

  describe("search", () => {
    it("returns game metadata when found", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockResolvedValueOnce([
        {
          id: 123,
          name: "Test Game",
          summary: "A test game",
          rating: 85.5,
          aggregated_rating: 82.3,
          genres: [{ id: 5, name: "Shooter" }],
          first_release_date: 1704067200,
        },
      ]);
      mockGetTimeToBeat.mockResolvedValueOnce(null);

      const result = await enricher.search("Test Game");

      expect(mockSearchGames).toHaveBeenCalledWith("Test Game", 1);
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Game");
      expect(result?.summary).toBe("A test game");
      expect(result?.rating).toBe(85.5);
    });

    it("returns null when no games found", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockResolvedValueOnce([]);

      const result = await enricher.search("Nonexistent Game");

      expect(result).toBeNull();
    });

    it("extracts Steam App ID from external_games", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockResolvedValueOnce([
        {
          id: 123,
          name: "Test Game",
          external_games: [
            { category: 1, uid: "12345" }, // Steam (category 1)
            { category: 5, uid: "67890" }, // GOG
          ],
        },
      ]);
      mockGetTimeToBeat.mockResolvedValueOnce(null);

      const result = await enricher.search("Test Game");

      expect(result?.steamAppId).toBe(12345);
    });

    it("fetches time-to-beat data and converts seconds to hours", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockResolvedValueOnce([
        {
          id: 123,
          name: "Test Game",
        },
      ]);
      mockGetTimeToBeat.mockResolvedValueOnce({
        game: 123,
        hastily: 36000, // 10 hours in seconds
        normally: 72000, // 20 hours in seconds
        completely: 144000, // 40 hours in seconds
      });

      const result = await enricher.search("Test Game");

      expect(result?.timeToBeat).toBeDefined();
      expect(result?.timeToBeat?.hastily).toBe(10);
      expect(result?.timeToBeat?.normally).toBe(20);
      expect(result?.timeToBeat?.completely).toBe(40);
    });

    it("handles API errors", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockRejectedValueOnce(new Error("API rate limit exceeded"));

      await expect(enricher.search("Test Game")).rejects.toThrow();
    });

    it("fixes image URLs correctly", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockSearchGames.mockResolvedValueOnce([
        {
          id: 123,
          name: "Test Game",
          cover: {
            url: "//images.igdb.com/igdb/image/upload/t_thumb/cover.jpg",
          },
          screenshots: [{ url: "//images.igdb.com/igdb/image/upload/t_thumb/screenshot1.jpg" }],
        },
      ]);
      mockGetTimeToBeat.mockResolvedValueOnce(null);

      const result = await enricher.search("Test Game");

      expect(result?.cover?.url).toMatch(/^https:\/\//);
      expect(result?.screenshots?.[0]?.url).toMatch(/^https:\/\//);
    });
  });

  describe("getById", () => {
    it("fetches game by IGDB ID", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockGetGameById.mockResolvedValueOnce({
        id: 456,
        name: "Game by ID",
        summary: "Fetched by ID",
      });
      mockGetTimeToBeat.mockResolvedValueOnce(null);

      const result = await enricher.getById(456);

      expect(mockGetGameById).toHaveBeenCalledWith(456);
      expect(result?.id).toBe(456);
      expect(result?.name).toBe("Game by ID");
    });

    it("returns null when game not found", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockGetGameById.mockResolvedValueOnce(null);

      const result = await enricher.getById(999);

      expect(result).toBeNull();
    });

    it("handles API errors", async () => {
      const { IgdbEnricher } = await import("@/services/enrichment/IgdbEnricher");
      const enricher = new IgdbEnricher();

      mockGetGameById.mockRejectedValueOnce(new Error("Network error"));

      await expect(enricher.getById(123)).rejects.toThrow();
    });
  });
});
