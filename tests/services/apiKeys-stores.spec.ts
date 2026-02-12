import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHttpResponse } from "../helpers/service-test-utils";

const mockFetch = vi.fn();
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

import { IGDBStore } from "@/services/api/apiKeys/IGDBStore";
import { SteamGridDBStore } from "@/services/api/apiKeys/SteamGridDBStore";
import { SteamStore } from "@/services/api/apiKeys/SteamStore";

describe("API key stores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IGDBStore", () => {
    it("returns display metadata", () => {
      const store = new IGDBStore();
      expect(store.getDisplayName()).toBe("IGDB");
      expect(store.getRequiredFields()).toEqual(["clientId", "clientSecret"]);
    });

    it("gets access token", async () => {
      const store = new IGDBStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({ access_token: "token", expires_in: 1, token_type: "bearer" }),
      );

      await expect(store.getAccessToken("id", "secret")).resolves.toBe("token");
    });

    it("fails access token request", async () => {
      const store = new IGDBStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({}, { ok: false, status: 401, statusText: "Unauthorized" }),
      );

      await expect(store.getAccessToken("id", "secret")).rejects.toThrow(
        "Failed to get access token",
      );
    });

    it("returns missing credentials error", async () => {
      const store = new IGDBStore();
      const res = await store.test({});
      expect(res.valid).toBe(false);
      expect(res.message).toContain("required");
    });

    it("returns valid when oauth and igdb calls succeed", async () => {
      const store = new IGDBStore();
      mockFetch
        .mockResolvedValueOnce(
          makeHttpResponse({ access_token: "token", expires_in: 1, token_type: "bearer" }),
        )
        .mockResolvedValueOnce(makeHttpResponse([{ id: 1, name: "Game" }]));

      const res = await store.test({ clientId: "id", clientSecret: "secret" });
      expect(res.valid).toBe(true);
      expect(res.message).toContain("valid");
    });

    it("returns unauthorized when igdb API says 401", async () => {
      const store = new IGDBStore();
      mockFetch
        .mockResolvedValueOnce(
          makeHttpResponse({ access_token: "token", expires_in: 1, token_type: "bearer" }),
        )
        .mockResolvedValueOnce(
          makeHttpResponse({}, { ok: false, status: 401, statusText: "Unauthorized" }),
        );

      const res = await store.test({ clientId: "id", clientSecret: "secret" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("unauthorized");
    });

    it("returns access token error message", async () => {
      const store = new IGDBStore();
      mockFetch.mockRejectedValueOnce(new Error("network down"));

      const res = await store.test({ clientId: "id", clientSecret: "secret" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("Failed to get access token");
    });
  });

  describe("SteamGridDBStore", () => {
    it("returns display metadata", () => {
      const store = new SteamGridDBStore();
      expect(store.getDisplayName()).toBe("SteamGridDB");
      expect(store.getRequiredFields()).toEqual(["apiKey"]);
    });

    it("returns required api key error", async () => {
      const store = new SteamGridDBStore();
      const res = await store.test({});
      expect(res.valid).toBe(false);
      expect(res.message).toContain("required");
    });

    it("returns valid when API call succeeds", async () => {
      const store = new SteamGridDBStore();
      mockFetch.mockResolvedValueOnce(makeHttpResponse({ data: {} }));

      const res = await store.test({ apiKey: "key" });
      expect(res.valid).toBe(true);
    });

    it("returns unauthorized when API key is invalid", async () => {
      const store = new SteamGridDBStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({}, { ok: false, status: 401, statusText: "Unauthorized" }),
      );

      const res = await store.test({ apiKey: "bad-key" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("unauthorized");
    });

    it("returns connection failure on throw", async () => {
      const store = new SteamGridDBStore();
      mockFetch.mockRejectedValueOnce(new Error("timeout"));

      const res = await store.test({ apiKey: "key" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("Connection failed");
    });
  });

  describe("SteamStore", () => {
    it("returns display metadata", () => {
      const store = new SteamStore();
      expect(store.getDisplayName()).toBe("Steam");
      expect(store.getRequiredFields()).toEqual(["apiKey", "steamId"]);
    });

    it("validates required fields", async () => {
      const store = new SteamStore();
      const res = await store.test({ apiKey: "" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("required");
    });

    it("returns valid when player is found", async () => {
      const store = new SteamStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({ response: { players: [{ steamid: "1" }] } }),
      );

      const res = await store.test({ apiKey: "key", steamId: "1" });
      expect(res.valid).toBe(true);
    });

    it("returns invalid steam id when no players", async () => {
      const store = new SteamStore();
      mockFetch.mockResolvedValueOnce(makeHttpResponse({ response: { players: [] } }));

      const res = await store.test({ apiKey: "key", steamId: "1" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("Invalid Steam ID");
    });

    it("maps unauthorized api key", async () => {
      const store = new SteamStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({}, { ok: false, status: 403, statusText: "Forbidden" }),
      );

      const res = await store.test({ apiKey: "bad", steamId: "1" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("unauthorized");
    });

    it("maps generic API error", async () => {
      const store = new SteamStore();
      mockFetch.mockResolvedValueOnce(
        makeHttpResponse({}, { ok: false, status: 500, statusText: "Server Error" }),
      );

      const res = await store.test({ apiKey: "key", steamId: "1" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("API error");
    });

    it("maps connection failure", async () => {
      const store = new SteamStore();
      mockFetch.mockRejectedValueOnce(new Error("network down"));

      const res = await store.test({ apiKey: "key", steamId: "1" });
      expect(res.valid).toBe(false);
      expect(res.message).toContain("Connection failed");
    });
  });
});
