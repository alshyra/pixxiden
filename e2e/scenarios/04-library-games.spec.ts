/**
 * Scenario 4: Library and Games
 * Tests game library loading and display
 */

import { waitForAppReady } from "../helpers";
import { LibraryPage } from "../page-objects/LibraryPage";
import { SettingsPage } from "../page-objects/SettingsPage";

describe("Scenario 4: Library and Games", () => {
  let libraryPage: LibraryPage;
  let settingsPage: SettingsPage;

  before(async () => {
    await waitForAppReady();
    libraryPage = new LibraryPage();
    settingsPage = new SettingsPage();
  });

  it("should check if games were loaded", async () => {
    console.log("\n🎮 Checking if games were loaded...");

    // Try to navigate to home if possible
    await libraryPage.navigateHome();

    const hasEmptyState = await libraryPage.hasEmptyState();
    const hasGamesUI = await libraryPage.hasGamesUI();

    await settingsPage.takeScreenshot("09-library-check");

    console.log(`Has empty state: ${hasEmptyState}`);
    console.log(`Has games UI: ${hasGamesUI}`);

    if (hasEmptyState) {
      console.log("⚠️ No games loaded (Epic authentication may have failed)");
    }
  });

  it("should display library UI", async () => {
    console.log("\n📊 Verifying library UI...");

    const hasUI = await libraryPage.hasLibraryUI();

    await settingsPage.takeScreenshot("10-library-ui");

    expect(hasUI).toBe(true);
    console.log("✅ Library UI is displayed");
  });
});
