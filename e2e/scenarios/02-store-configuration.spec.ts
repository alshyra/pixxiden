/**
 * Scenario 2: Store Configuration
 * Tests the store configuration UI and navigation
 */

import { waitForAppReady } from "../helpers";
import { SettingsPage } from "../page-objects/SettingsPage";
import { StoreSettingsPage } from "../page-objects/StoreSettingsPage";

describe("Scenario 2: Store Configuration", () => {
  let settingsPage: SettingsPage;
  let storeSettingsPage: StoreSettingsPage;

  before(async () => {
    await waitForAppReady();
    settingsPage = new SettingsPage();
    storeSettingsPage = new StoreSettingsPage();
  });

  it.only("should redirect to settings/store when no stores configured", async () => {
    console.log("\n🏪 Checking redirect to settings/store...");

    await browser.pause(2000);

    const currentUrl = await settingsPage.getCurrentUrl();
    console.log(`Current URL: ${currentUrl}`);
    
    const isOnSettings = await settingsPage.isOnSettings();
    expect(isOnSettings).toBe(true);
    const bodyText = await $("body").getText();
    const hasStoreConfigUI = bodyText.includes("Epic Games") || bodyText.includes("Comptes");

    await settingsPage.takeScreenshot("03-settings-redirect");

    expect(hasStoreConfigUI).toBe(true);
    console.log("✅ App shows store configuration UI");
  });

  it("should navigate to Comptes tab if not already there", async () => {
    console.log("\n📋 Navigating to Comptes tab...");

    const currentUrl = await settingsPage.getCurrentUrl();

    if (!currentUrl.includes("settings/store")) {
      await settingsPage.navigateToStoreSettings();
    }

    await settingsPage.takeScreenshot("04-comptes-tab");
    console.log("✅ Clicked Comptes tab");
  });

  it("should show Epic Games connection option", async () => {
    console.log("\n🎮 Looking for Epic Games connection...");

    const hasEpicGames = await storeSettingsPage.hasStore("Epic Games");
    const hasConnectionButton = await storeSettingsPage.hasStore("CONNEXION");

    await settingsPage.takeScreenshot("05-epic-games-option");

    expect(hasEpicGames).toBe(true);
    expect(hasConnectionButton).toBe(true);
    console.log("✅ Epic Games connection option visible");
  });
});
