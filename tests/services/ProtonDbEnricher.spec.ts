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

describe("ProtonDbEnricher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchByAppId", () => {
    it("fetches ProtonDB data by Steam App ID", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tier: "platinum",
          confidence: "high",
          score: 0.95,
          total: 100,
        }),
      });

      const result = await enricher.searchByAppId(12345);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("12345.json"),
        expect.any(Object),
      );
      expect(result).toBeDefined();
      expect(result?.tier).toBe("platinum");
      expect(result?.confidence).toBe("high");
      expect(result?.score).toBe(0.95);
    });

    it("returns null when game not found (404)", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await enricher.searchByAppId(99999);

      expect(result).toBeNull();
    });

    it("normalizes tier values to lowercase", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tier: "GOLD",
          confidence: "HIGH",
        }),
      });

      const result = await enricher.searchByAppId(12345);

      expect(result?.tier).toBe("gold");
    });

    it("handles bestReportedTier fallback", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          bestReportedTier: "silver",
          confidence: "medium",
        }),
      });

      const result = await enricher.searchByAppId(12345);

      expect(result?.tier).toBe("silver");
    });

    it("handles API errors", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(enricher.searchByAppId(12345)).rejects.toThrow();
    });

    it("returns null when no tier data", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          confidence: "low",
        }),
      });

      const result = await enricher.searchByAppId(12345);

      expect(result).toBeNull();
    });
  });

  describe("searchByTitle", () => {
    it("returns null (not supported)", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      const result = await enricher.searchByTitle("Test Game");

      expect(result).toBeNull();
    });
  });

  describe("Helper methods", () => {
    it("getTierColor returns correct colors", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      expect(enricher.getTierColor("platinum")).toBe("#b4c7dc");
      expect(enricher.getTierColor("gold")).toBe("#f4e500");
      expect(enricher.getTierColor("silver")).toBe("#c0c0c0");
      expect(enricher.getTierColor("bronze")).toBe("#cd7f32");
      expect(enricher.getTierColor("borked")).toBe("#ff0000");
      expect(enricher.getTierColor("unknown")).toBe("#666666");
    });

    it("getTierDescription returns correct descriptions", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      expect(enricher.getTierDescription("platinum")).toContain("Perfect");
      expect(enricher.getTierDescription("gold")).toContain("Great");
      expect(enricher.getTierDescription("borked")).toContain("Broken");
    });

    it("isPlayable returns correct values", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      expect(enricher.isPlayable("platinum")).toBe(true);
      expect(enricher.isPlayable("gold")).toBe(true);
      expect(enricher.isPlayable("silver")).toBe(true);
      expect(enricher.isPlayable("bronze")).toBe(true);
      expect(enricher.isPlayable("borked")).toBe(false);
      expect(enricher.isPlayable("unknown")).toBe(false);
    });

    it("getTierScore returns correct numeric values", async () => {
      const { ProtonDbEnricher } = await import("@/services/enrichment/ProtonDbEnricher");
      const enricher = new ProtonDbEnricher();

      expect(enricher.getTierScore("platinum")).toBe(100);
      expect(enricher.getTierScore("gold")).toBe(80);
      expect(enricher.getTierScore("silver")).toBe(60);
      expect(enricher.getTierScore("bronze")).toBeGreaterThan(0);
    });
  });
});
