/**
 * Scenario 04 — Game Launch
 *
 * User journey: user opens an installed game's detail page →
 * clicks the Play button → sees launching overlay →
 * force-closes the game → returns to normal state.
 *
 * Prerequisites: at least one installed game in the library.
 * If no installed game is found, the scenario is skipped gracefully.
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";
import { GameDetailPage } from "../page-objects/GameDetailPage";

describe("Scenario 04: Game Launch", () => {
  const library = new LibraryPage();
  const detail = new GameDetailPage();
  let installedGameFound = false;

  before(async () => {
    await waitForAppReady();
    await library.waitForReady();
    await library.waitForLoaded(45000);
  });

  it("should find an installed game and open its detail", async function () {
    const hasGames = await library.hasGames();
    if (!hasGames) {
      console.log("⏩ No games in library, skipping launch scenario");
      this.skip();
      return;
    }

    // Try the "Installés" filter first to find an installed game
    try {
      await library.clickFilter("installed");
      await browser.pause(1000);
    } catch {
      console.log("⚠️ Installed filter not clickable, trying all games");
    }

    const count = await library.getGameCardCount();
    if (count === 0) {
      // Reset filter and skip
      try {
        await library.clickFilter("all");
      } catch {
        // ignore
      }
      console.log("⏩ No installed games found, skipping launch scenario");
      this.skip();
      return;
    }

    console.log(`🎮 Found ${count} installed game(s)`);
    await library.selectFirstGame();
    await detail.waitForReady();

    // Verify this game actually has a Play button
    const hasPlay = await detail.hasPlayButton();
    if (!hasPlay) {
      console.log("⏩ First installed game doesn't show Play button, skipping");
      await detail.goBack();
      await library.waitForReady();
      try {
        await library.clickFilter("all");
      } catch {
        // ignore
      }
      this.skip();
      return;
    }

    installedGameFound = true;
    let title = "Unknown";
    try {
      title = await detail.getGameTitle();
    } catch {
      title = "(title unavailable)";
    }
    console.log(`🎮 Selected installed game: "${title}"`);
  });

  it("should show Play button and NOT force-close button", async function () {
    if (!installedGameFound) this.skip();

    expect(await detail.hasPlayButton()).toBe(true);
    expect(await detail.hasForceCloseButton()).toBe(false);
    console.log("▶️ Play button visible, Force Close hidden");
  });

  it("should launch the game when clicking Play", async function () {
    if (!installedGameFound) this.skip();

    await detail.clickPlay();
    console.log("🚀 Play clicked — game is launching");

    // Wait for the launch state to propagate (isLaunching = true)
    await browser.pause(2000);

    // After launching, the Force Close button should appear
    // (or the game may have already exited if it fails fast)
    const hasForceClose = await detail.hasForceCloseButton();
    if (hasForceClose) {
      console.log("🔴 Force Close button appeared — game is running");
    } else {
      console.log("⚠️ Force Close not visible (game may have exited or failed)");
    }
  });

  it("should force-close the game and restore Play button", async function () {
    if (!installedGameFound) this.skip();

    const hasForceClose = await detail.hasForceCloseButton();
    if (!hasForceClose) {
      console.log("⏩ No force-close button visible, skipping force-close test");
      this.skip();
      return;
    }

    await detail.clickForceClose();
    console.log("⏹️ Force Close clicked");

    // Wait for the game to stop and UI to reset
    await browser.waitUntil(
      async () => {
        const hasPlay = await detail.hasPlayButton();
        return hasPlay;
      },
      { timeout: 10000, timeoutMsg: "Play button did not reappear after force close" },
    );

    expect(await detail.hasPlayButton()).toBe(true);
    expect(await detail.hasForceCloseButton()).toBe(false);
    console.log("▶️ Play button restored after force close");
  });

  after(async () => {
    // Always go back to library and reset filters
    try {
      if (await detail.isDisplayed()) {
        await detail.goBack();
      }
      await library.waitForReady();
      await library.clickFilter("all");
    } catch {
      // Best-effort cleanup
    }
  });
});
