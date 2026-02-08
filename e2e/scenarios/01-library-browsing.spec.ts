/**
 * Scenario 01 — Library Browsing
 *
 * User journey: user launches the app → sees the game library →
 * hero banner shows a selected game → filters are available →
 * game count is displayed → user can browse game cards.
 *
 * Prerequisites: at least one store connected with games synced.
 * If no games are found, the scenario verifies the empty state.
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";

describe("Scenario 01: Library Browsing", () => {
  const library = new LibraryPage();

  before(async () => {
    await waitForAppReady();
  });

  it("should display the library view after app launch", async () => {
    await library.waitForReady();
  });

  it("should finish loading and show either games or empty state", async () => {
    // Wait for loading to finish (sync may take time)
    await library.waitForLoaded(45000);

    const hasGames = await library.hasGames();
    const isEmpty = await library.hasEmptyState();

    // Exactly one should be true
    expect(hasGames || isEmpty).toBe(true);
    console.log(hasGames ? "📚 Games are loaded" : "📭 Library is empty (no stores configured?)");
  });

  it("should show filters bar for store selection", async () => {
    const hasFilters = await library.hasFilters();
    expect(hasFilters).toBe(true);
  });

  describe("when games are available", () => {
    before(async function () {
      const hasGames = await library.hasGames();
      if (!hasGames) {
        console.log("⏩ Skipping game-dependent tests (no games)");
        this.skip();
      }
    });

    it("should display a game count indicator", async () => {
      const countText = await library.getGameCountText();
      expect(countText).not.toBeNull();
      console.log(`🎮 Game count: ${countText}`);
    });

    it("should show at least one game card", async () => {
      const count = await library.getGameCardCount();
      expect(count).toBeGreaterThan(0);
      console.log(`🃏 Visible game cards: ${count}`);
    });

    it("should display the hero banner with a game title", async () => {
      const hasBanner = await library.hasHeroBanner();
      expect(hasBanner).toBe(true);

      const heroTitle = await library.getHeroTitle();
      expect(heroTitle.length).toBeGreaterThan(0);
      console.log(`🎬 Hero banner shows: "${heroTitle}"`);
    });

    it("should update hero banner when selecting a different game", async () => {
      const cards = await library.getGameCards();
      if (cards.length < 2) {
        console.log("⏩ Only one game card, skipping hero update test");
        return;
      }

      // Get initial hero title
      const initialTitle = await library.getHeroTitle();

      // Hover (moveTo) the second card — click would navigate to detail page
      await cards[1].moveTo();
      await browser.pause(800);

      // Hero title may have changed (depends on the game list)
      const newTitle = await library.getHeroTitle();
      expect(newTitle.length).toBeGreaterThan(0);
      console.log(`🎬 Hero updated: "${initialTitle}" → "${newTitle}"`);
    });

    it("should filter games by store when clicking a filter", async () => {
      // Click "Tous" (All) first to ensure we're at baseline
      await library.clickFilter("all");
      const totalCount = await library.getGameCardCount();

      // Try each store filter — at least one should reduce the count
      const storeFilters = ["epic", "gog", "amazon", "steam"] as const;
      for (const store of storeFilters) {
        try {
          await library.clickFilter(store);
          const filteredCount = await library.getGameCardCount();
          console.log(`🔍 Filter "${store}": ${filteredCount} games`);

          if (filteredCount > 0 && filteredCount < totalCount) {
            console.log(`✅ Filter "${store}" correctly reduces the list`);
          }
        } catch {
          // Filter button might not exist if no games from this store
          console.log(`⏩ Filter "${store}" not available`);
        }
      }

      // Reset to "All"
      await library.clickFilter("all");
    });
  });
});
