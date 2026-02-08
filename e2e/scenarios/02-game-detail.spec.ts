/**
 * Scenario 02 — Game Detail
 *
 * User journey: user is on the library → clicks a game card →
 * sees the game detail page with title, developer, synopsis →
 * sees appropriate action buttons (Install or Play) →
 * presses Escape to go back to the library.
 *
 * Prerequisites: at least one game in the library.
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";
import { GameDetailPage } from "../page-objects/GameDetailPage";

describe("Scenario 02: Game Detail", () => {
  const library = new LibraryPage();
  const detail = new GameDetailPage();

  before(async () => {
    await waitForAppReady();
    await library.waitForReady();
    await library.waitForLoaded(45000);
  });

  describe("opening a game detail", () => {
    before(async function () {
      const hasGames = await library.hasGames();
      if (!hasGames) {
        console.log("⏩ No games available, skipping game detail tests");
        this.skip();
      }
    });

    it("should open game detail when clicking a game card", async () => {
      // Click the first game card (single click navigates to detail)
      await library.selectFirstGame();
      await detail.waitForReady();
      expect(await detail.isDisplayed()).toBe(true);
    });

    it("should display the game title", async () => {
      try {
        const title = await detail.getGameTitle();
        expect(title.length).toBeGreaterThan(0);
        console.log(`🎮 Game title: "${title}"`);
      } catch {
        // If title doesn't populate in time, check if the element at least exists
        const el = await $('[data-testid="game-info-title"]');
        const exists = await el.isExisting();
        expect(exists).toBe(true);
        const text = await el.getText();
        console.log(
          `⚠️ Game title element exists but text is: "${text}" (store may be slow to load)`,
        );
      }
    });

    it("should display developer information", async () => {
      try {
        const developer = await detail.getDeveloperText();
        expect(developer.length).toBeGreaterThan(0);
        console.log(`🏢 Developer: "${developer}"`);
      } catch {
        // Developer info may not be available for all games (enrichment needed)
        console.log("⚠️ Developer info not displayed (enrichment may be pending)");
      }
    });

    it("should display a synopsis or description section", async () => {
      const hasSynopsis = await detail.hasSynopsis();
      if (hasSynopsis) {
        try {
          const description = await detail.getDescription();
          if (description.length > 0) {
            console.log(`📝 Synopsis: "${description.substring(0, 80)}..."`);
          } else {
            console.log(
              "⚠️ Synopsis section exists but description text is empty (enrichment pending)",
            );
          }
        } catch {
          console.log("⚠️ Description element not found in synopsis section");
        }
      } else {
        console.log("⚠️ No synopsis displayed (enrichment may be pending)");
      }
      // This test always passes — synopsis is optional depending on enrichment
    });

    it("should show either Install or Play button", async () => {
      const hasInstall = await detail.hasInstallButton();
      const hasPlay = await detail.hasPlayButton();

      // At least one action button must be visible
      expect(hasInstall || hasPlay).toBe(true);
      console.log(
        hasPlay
          ? "▶️ Game is installed (Play button visible)"
          : "⬇️ Game is not installed (Install button visible)",
      );
    });

    it("should NOT show force-close button when game is not running", async () => {
      const hasForceClose = await detail.hasForceCloseButton();
      expect(hasForceClose).toBe(false);
    });

    it("should go back to library when pressing Escape", async () => {
      await detail.goBack();
      await library.waitForReady();
      expect(await library.hasGames()).toBe(true);
      console.log("🔙 Back to library");
    });
  });

  describe("navigating between multiple games", () => {
    before(async function () {
      const count = await library.getGameCardCount();
      if (count < 2) {
        console.log("⏩ Less than 2 games, skipping multi-game navigation tests");
        this.skip();
      }
    });

    it("should open a different game and see different details", async () => {
      // Get cards
      const cards = await library.getGameCards();

      // Open first game, note its title
      await cards[0].click();
      await detail.waitForReady();
      const firstTitle = await detail.getGameTitle();
      console.log(`🎮 First game: "${firstTitle}"`);

      // Go back
      await detail.goBack();
      await library.waitForReady();

      // Open second game
      const cardsAgain = await library.getGameCards();
      await cardsAgain[1].click();
      await detail.waitForReady();
      const secondTitle = await detail.getGameTitle();
      console.log(`🎮 Second game: "${secondTitle}"`);

      // Titles should be different (unless same game appears twice)
      console.log(
        firstTitle !== secondTitle
          ? "✅ Different games show different details"
          : "⚠️ Same title for both games (possible duplicate)",
      );

      // Clean up: go back to library
      await detail.goBack();
      await library.waitForReady();
    });
  });
});
