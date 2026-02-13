import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn();

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("SteamGridDbEnricher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("configure", () => {
    it("configures API key", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "test-api-key" });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe("search", () => {
    it("throws when not configured", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      await expect(enricher.search("Test Game")).rejects.toThrow(
        "SteamGridDB not configured. Call configure() first.",
      );
    });

    it("fetches artwork for a game", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "test-api-key" });

      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [{ id: 12345, name: "Test Game", verified: true, types: ["game"] }],
        }),
      });

      // Mock artwork responses (hero, grid, horizontal, logo, icon)
      const mockArtworkResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              id: 1,
              url: "https://cdn.steamgriddb.com/image.png",
              thumb: "https://cdn.steamgriddb.com/thumb.png",
              width: 600,
              height: 900,
              author: { name: "Artist" },
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockArtworkResponse) // hero
        .mockResolvedValueOnce(mockArtworkResponse) // grid
        .mockResolvedValueOnce(mockArtworkResponse) // horizontal grid
        .mockResolvedValueOnce(mockArtworkResponse) // logo
        .mockResolvedValueOnce(mockArtworkResponse); // icon

      const result = await enricher.search("Test Game");

      expect(result).toBeDefined();
      expect(result?.hero).toBe("https://cdn.steamgriddb.com/image.png");
      expect(result?.grid).toBe("https://cdn.steamgriddb.com/image.png");
      expect(result?.horizontalGrid).toBe("https://cdn.steamgriddb.com/image.png");
      expect(result?.logo).toBe("https://cdn.steamgriddb.com/image.png");
      expect(result?.icon).toBe("https://cdn.steamgriddb.com/image.png");
    });

    it("returns null when game not found", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      const result = await enricher.search("Nonexistent Game");

      expect(result).toBeNull();
    });

    it("handles API errors", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "test-api-key" });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(enricher.search("Test Game")).rejects.toThrow();
    });

    it("handles missing artwork gracefully", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "test-api-key" });

      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [{ id: 12345, name: "Test Game" }],
        }),
      });

      // Mock empty artwork responses
      const emptyArtworkResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(emptyArtworkResponse) // hero
        .mockResolvedValueOnce(emptyArtworkResponse) // grid
        .mockResolvedValueOnce(emptyArtworkResponse) // horizontal grid
        .mockResolvedValueOnce(emptyArtworkResponse) // logo
        .mockResolvedValueOnce(emptyArtworkResponse); // icon

      const result = await enricher.search("Test Game");

      expect(result).toBeDefined();
      expect(result?.hero).toBeUndefined();
      expect(result?.grid).toBeUndefined();
      expect(result?.logo).toBeUndefined();
    });

    it("sends Authorization header with API key", async () => {
      const { SteamGridDbEnricher } = await import("@/services/enrichment/SteamGridDbEnricher");
      const enricher = new SteamGridDbEnricher();

      enricher.configure({ apiKey: "secret-key-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] }),
      });

      await enricher.search("Test Game").catch(() => {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer secret-key-123",
          },
        }),
      );
    });
  });
});
