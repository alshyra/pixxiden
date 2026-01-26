/**
 * Tests pour le store library (Pinia)
 * Teste le chargement des jeux depuis les différents stores
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

describe("Library Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Store Status", () => {
    it("should fetch store status for all stores", async () => {
      const mockStatus = [
        { name: "epic", available: true, authenticated: true },
        { name: "gog", available: true, authenticated: false },
        { name: "amazon", available: false, authenticated: false },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

      const result = await invoke("get_store_status");

      expect(invoke).toHaveBeenCalledWith("get_store_status");
      expect(result).toEqual(mockStatus);
      expect(result).toHaveLength(3);
    });

    it("should detect Legendary (Epic) availability", async () => {
      const mockStatus = [{ name: "epic", available: true, authenticated: true }];

      vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

      const result = await invoke("get_store_status");
      const epic = (result as any[]).find((s: any) => s.name === "epic");

      expect(epic).toBeDefined();
      expect(epic.available).toBe(true);
    });

    it("should detect GOGDL availability", async () => {
      const mockStatus = [{ name: "gog", available: true, authenticated: false }];

      vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

      const result = await invoke("get_store_status");
      const gog = (result as any[]).find((s: any) => s.name === "gog");

      expect(gog).toBeDefined();
      expect(gog.available).toBe(true);
    });

    it("should detect Nile (Amazon) availability", async () => {
      const mockStatus = [{ name: "amazon", available: false, authenticated: false }];

      vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

      const result = await invoke("get_store_status");
      const amazon = (result as any[]).find((s: any) => s.name === "amazon");

      expect(amazon).toBeDefined();
      expect(amazon.available).toBe(false);
    });
  });

  describe("Game Loading", () => {
    it("should load games from backend", async () => {
      const mockGames = [
        { id: "1", title: "Game 1", store: "epic", store_id: "epic1", installed: true },
        { id: "2", title: "Game 2", store: "gog", store_id: "gog1", installed: false },
        { id: "3", title: "Game 3", store: "epic", store_id: "epic2", installed: false },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockGames);

      const result = await invoke("get_games");

      expect(invoke).toHaveBeenCalledWith("get_games");
      expect(result).toHaveLength(3);
    });

    it("should filter games by Epic store", async () => {
      const mockGames = [
        { id: "1", title: "Epic Game 1", store: "epic", store_id: "epic1", installed: true },
        { id: "2", title: "GOG Game", store: "gog", store_id: "gog1", installed: false },
        { id: "3", title: "Epic Game 2", store: "epic", store_id: "epic2", installed: false },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockGames);

      const result = await invoke("get_games");
      const epicGames = (result as any[]).filter((g: any) => g.store === "epic");

      expect(epicGames).toHaveLength(2);
      expect(epicGames[0].store).toBe("epic");
    });

    it("should filter games by GOG store", async () => {
      const mockGames = [
        { id: "1", title: "Epic Game", store: "epic", store_id: "epic1", installed: true },
        { id: "2", title: "GOG Game 1", store: "gog", store_id: "gog1", installed: false },
        { id: "3", title: "GOG Game 2", store: "gog", store_id: "gog2", installed: true },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockGames);

      const result = await invoke("get_games");
      const gogGames = (result as any[]).filter((g: any) => g.store === "gog");

      expect(gogGames).toHaveLength(2);
    });

    it("should identify installed games", async () => {
      const mockGames = [
        { id: "1", title: "Game 1", store: "epic", store_id: "epic1", installed: true },
        { id: "2", title: "Game 2", store: "gog", store_id: "gog1", installed: false },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockGames);

      const result = await invoke("get_games");
      const installedGames = (result as any[]).filter((g: any) => g.installed);

      expect(installedGames).toHaveLength(1);
      expect(installedGames[0].title).toBe("Game 1");
    });
  });

  describe("Library Sync", () => {
    it("should sync games from all stores", async () => {
      const mockSyncResult = {
        total_games: 10,
        new_games: 3,
        updated_games: 2,
        errors: [],
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockSyncResult);

      const result = await invoke("sync_games");

      expect(invoke).toHaveBeenCalledWith("sync_games");
      expect((result as any).total_games).toBe(10);
      expect((result as any).errors).toHaveLength(0);
    });

    it("should report sync errors gracefully", async () => {
      const mockSyncResult = {
        total_games: 5,
        new_games: 2,
        updated_games: 1,
        errors: ["Epic sync failed: network error"],
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockSyncResult);

      const result = await invoke("sync_games");

      expect((result as any).errors).toHaveLength(1);
      expect((result as any).errors[0]).toContain("Epic");
    });
  });

  describe("Game Management", () => {
    it("should get game details", async () => {
      const mockGame = {
        id: "1",
        title: "Test Game",
        store: "epic",
        store_id: "epic-test-123",
        installed: true,
        install_path: "/home/user/Games/TestGame",
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockGame);

      const result = await invoke("get_game", { id: "1" });

      expect(invoke).toHaveBeenCalledWith("get_game", { id: "1" });
      expect((result as any).title).toBe("Test Game");
    });

    it("should get game config", async () => {
      const mockConfig = {
        id: "1",
        title: "Test Game",
        store: "epic",
        store_id: "epic-test-123",
        install_path: "/home/user/Games/TestGame",
        wine_prefix: "/home/user/.wine",
        wine_version: "wine-9.0",
        installed: true,
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockConfig);

      const result = await invoke("get_game_config", { id: "1" });

      expect((result as any).wine_prefix).toBeDefined();
      expect((result as any).installed).toBe(true);
    });

    it("should handle non-existent game", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Game not found"));

      await expect(invoke("get_game", { id: "non-existent" })).rejects.toThrow("Game not found");
    });
  });
});
