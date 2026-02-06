/**
 * Scenario 4: Library and Games
 * Tests game library display and readiness
 * Each test is independent and can run in isolation
 */

import { waitForAppReady } from "../helpers";
import { LibraryPage } from "../page-objects/LibraryPage";
import { SettingsPage } from "../page-objects/SettingsPage";

describe("Scenario 4: Library and Games", () => {
  it("should display library and load games if configured", async () => {
    console.log("\n📚 Starting library display test...");

    // 1. Wait for app ready
    await waitForAppReady();
    const libraryPage = new LibraryPage();
    const settingsPage = new SettingsPage();

    // 2. Navigate to library home
    await libraryPage.navigateHome();
    console.log("✅ Navigated to library home");

    // 3. Check library UI exists
    const hasLibraryUI = await libraryPage.hasLibraryUI();
    expect(hasLibraryUI).toBe(true);
    console.log("✅ Library UI is displayed");

    await settingsPage.takeScreenshot("04-library-ui");

    // 4. Check game loading state
    const hasEmptyState = await libraryPage.hasEmptyState();
    const hasGamesUI = await libraryPage.hasGamesUI();

    if (hasEmptyState) {
      console.log("⚠️ No games loaded (expected if stores not connected or games not synced)");
    } else if (hasGamesUI) {
      console.log("✅ Games loaded and library is ready");
    } else {
      console.log("ℹ️ Library UI present but game state unclear");
    }

    await settingsPage.takeScreenshot("04-library-state");

    // 5. Verify app didn't crash and library is responsive
    const bodyText = await $("body").getText();
    expect(bodyText.length).toBeGreaterThan(0);
    console.log("✅ Library is responsive");
  });
});
