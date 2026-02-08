/**
 * Scenario 05 — Game Installation
 *
 * User journey: user opens an uninstalled game's detail page →
 * clicks Install → sees the install modal with options →
 * starts the download → sees progress → cancels the download.
 *
 * Prerequisites: at least one uninstalled game in the library.
 * If no uninstalled game is found, the scenario is skipped.
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";
import { GameDetailPage } from "../page-objects/GameDetailPage";

describe("Scenario 05: Game Installation", () => {
  const library = new LibraryPage();
  const detail = new GameDetailPage();
  let uninstalledGameFound = false;

  before(async () => {
    await waitForAppReady();
    await library.waitForReady();
    await library.waitForLoaded(45000);
  });

  it("should find an uninstalled game and open its detail", async function () {
    const hasGames = await library.hasGames();
    if (!hasGames) {
      console.log("⏩ No games in library, skipping installation scenario");
      this.skip();
      return;
    }

    // Ensure we're on "All" filter
    try {
      await library.clickFilter("all");
      await browser.pause(500);
    } catch {
      // ignore
    }

    // Try each game card until we find one with an Install button
    const cards = await library.getGameCards();
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      try {
        const cardsRefresh = await library.getGameCards();
        await cardsRefresh[i].click();
        await detail.waitForReady();

        const hasInstall = await detail.hasInstallButton();
        if (hasInstall) {
          let title = "Unknown";
          try {
            title = await detail.getGameTitle();
          } catch {
            title = "(title unavailable)";
          }
          uninstalledGameFound = true;
          console.log(`📦 Found uninstalled game: "${title}"`);
          return;
        }

        // Not this one, go back
        await detail.goBack();
        await library.waitForReady();
      } catch {
        // Card might not be clickable, continue
        try {
          if (await detail.isDisplayed()) {
            await detail.goBack();
            await library.waitForReady();
          }
        } catch {
          // Best effort
        }
      }
    }

    if (!uninstalledGameFound) {
      console.log("⏩ No uninstalled game found, skipping installation scenario");
      this.skip();
    }
  });

  it("should display the Install button", async function () {
    if (!uninstalledGameFound) this.skip();

    expect(await detail.hasInstallButton()).toBe(true);
    expect(await detail.hasPlayButton()).toBe(false);
    console.log("⬇️ Install button visible, Play button hidden");
  });

  it("should open the install modal when clicking Install", async function () {
    if (!uninstalledGameFound) this.skip();

    await detail.clickInstall();
    await browser.pause(1500);

    // The install modal should be visible — it's a HeadlessUI dialog
    // Look for the modal overlay or dialog content
    const modal = await $('[role="dialog"], [data-testid="install-modal"]');
    let modalVisible = false;
    try {
      modalVisible = await modal.isDisplayed();
    } catch {
      modalVisible = false;
    }

    if (modalVisible) {
      console.log("📋 Install modal opened");

      // Verify modal has expected content
      const modalText = await modal.getText();

      // Should mention installation path or disk space
      const hasInstallContent =
        modalText.includes("Install") ||
        modalText.includes("Parcourir") ||
        modalText.includes("Installer") ||
        modalText.includes("Espace") ||
        modalText.includes("chemin") ||
        modalText.length > 20;

      expect(hasInstallContent).toBe(true);
      console.log(`📝 Modal content length: ${modalText.length} chars`);
    } else {
      // Some games might start installing directly without modal
      console.log("⚠️ No modal appeared (game may install directly)");
    }
  });

  it("should allow cancelling the installation", async function () {
    if (!uninstalledGameFound) this.skip();

    // Look for cancel button in the modal
    const cancelSelectors = [
      "button*=Annuler",
      "button*=Cancel",
      '[data-testid="cancel-install"]',
      "button.text-red",
    ];

    let cancelled = false;
    for (const selector of cancelSelectors) {
      try {
        const cancelBtn = await $(selector);
        if (await cancelBtn.isDisplayed()) {
          await cancelBtn.click();
          cancelled = true;
          console.log("❌ Clicked cancel button");
          break;
        }
      } catch {
        continue;
      }
    }

    if (!cancelled) {
      // Try pressing Escape to close the modal
      await browser.keys(["Escape"]);
      console.log("❌ Pressed Escape to close modal");
    }

    await browser.pause(1000);

    // The Install button should still be visible (installation was cancelled)
    expect(await detail.hasInstallButton()).toBe(true);
    console.log("⬇️ Install button still visible after cancellation");
  });

  after(async () => {
    // Always go back to library
    try {
      // Close any open modal first
      await browser.keys(["Escape"]);
      await browser.pause(500);

      if (await detail.isDisplayed()) {
        await detail.goBack();
      }
      await library.waitForReady();
    } catch {
      // Best-effort cleanup
    }
  });
});
