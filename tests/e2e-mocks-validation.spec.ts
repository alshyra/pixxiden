/**
 * Simple validation test for mock system
 * This runs without needing WebDriver/browser
 */

import { describe, it, expect } from "vitest";
import {
  mockGames,
  getGamesByStore,
  getInstalledGames,
  getNotInstalledGames,
} from "../e2e/fixtures/mockGames";
import { getMockGameStats } from "../e2e/helpers/mockHelpers";

describe("Mock System Validation", () => {
  describe("mockGames fixture", () => {
    it("should have 15 games total", () => {
      expect(mockGames).toHaveLength(15);
    });

    it("should have 10 installed games", () => {
      const installed = getInstalledGames();
      expect(installed).toHaveLength(10);
    });

    it("should have 5 not installed games", () => {
      const notInstalled = getNotInstalledGames();
      expect(notInstalled).toHaveLength(5);
    });

    it("should have games from all three stores", () => {
      const epicGames = getGamesByStore("epic");
      const gogGames = getGamesByStore("gog");
      const amazonGames = getGamesByStore("amazon");

      expect(epicGames.length).toBeGreaterThan(0);
      expect(gogGames.length).toBeGreaterThan(0);
      expect(amazonGames.length).toBeGreaterThan(0);
    });

    it("should have 7 Epic games, 5 GOG games, and 3 Amazon games", () => {
      const epicGames = getGamesByStore("epic");
      const gogGames = getGamesByStore("gog");
      const amazonGames = getGamesByStore("amazon");

      expect(epicGames).toHaveLength(7);
      expect(gogGames).toHaveLength(5);
      expect(amazonGames).toHaveLength(3);
    });

    it("should have unique game IDs", () => {
      const ids = mockGames.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("each game should have required fields", () => {
      mockGames.forEach((game) => {
        expect(game.id).toBeDefined();
        expect(game.title).toBeDefined();
        expect(game.store).toBeDefined();
        expect(game.storeId).toBeDefined();
        expect(game.appId).toBeDefined();
        expect(typeof game.installed).toBe("boolean");
      });
    });

    it("installed games should have install paths", () => {
      const installed = getInstalledGames();
      installed.forEach((game) => {
        expect(game.installPath).toBeTruthy();
        expect(game.executablePath).toBeTruthy();
      });
    });

    it("not installed games should have empty install paths", () => {
      const notInstalled = getNotInstalledGames();
      notInstalled.forEach((game) => {
        expect(game.installPath).toBe("");
        expect(game.executablePath).toBe("");
      });
    });
  });

  describe("getMockGameStats", () => {
    it("should return correct statistics", () => {
      const stats = getMockGameStats();

      expect(stats.total).toBe(15);
      expect(stats.installed).toBe(10);
      expect(stats.notInstalled).toBe(5);
      expect(stats.byStore.epic).toBe(7);
      expect(stats.byStore.gog).toBe(5);
      expect(stats.byStore.amazon).toBe(3);
    });

    it("installed + not installed should equal total", () => {
      const stats = getMockGameStats();
      expect(stats.installed + stats.notInstalled).toBe(stats.total);
    });

    it("sum of stores should equal total", () => {
      const stats = getMockGameStats();
      const storeSum = stats.byStore.epic + stats.byStore.gog + stats.byStore.amazon;
      expect(storeSum).toBe(stats.total);
    });
  });

  describe("Game data integrity", () => {
    it("all games should have valid store values", () => {
      const validStores = ["epic", "gog", "amazon"];
      mockGames.forEach((game) => {
        expect(validStores).toContain(game.store);
      });
    });

    it("all games should have non-empty storeId", () => {
      mockGames.forEach((game) => {
        expect(game.storeId).toBeTruthy();
        expect(game.storeId.length).toBeGreaterThan(0);
      });
    });

    it("play time should be a number", () => {
      mockGames.forEach((game) => {
        if (game.playTime !== undefined) {
          expect(typeof game.playTime).toBe("number");
          expect(game.playTime).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it("installed games should have last played date", () => {
      const installed = getInstalledGames();
      installed.forEach((game) => {
        if (game.playTime && game.playTime > 0) {
          // Games with play time should have last played date
          expect(game.lastPlayed).toBeDefined();
        }
      });
    });
  });
});
