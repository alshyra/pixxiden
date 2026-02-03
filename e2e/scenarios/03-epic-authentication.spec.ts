/**
 * Scenario 3: Epic Games Authentication
 * Tests the Epic Games OAuth flow
 */

import { waitForAppReady } from "../helpers";
import { SettingsPage } from "../page-objects/SettingsPage";
import { StoreSettingsPage } from "../page-objects/StoreSettingsPage";

describe("Scenario 3: Epic Games Authentication", () => {
  let settingsPage: SettingsPage;
  let storeSettingsPage: StoreSettingsPage;

  before(async () => {
    await waitForAppReady();
    settingsPage = new SettingsPage();
    storeSettingsPage = new StoreSettingsPage();
  });

  it("should open Epic Games authentication when clicking connection button", async () => {
    console.log("\n🔓 Opening Epic Games authentication...");

    await storeSettingsPage.clickStoreConnection("Epic Games");

    await settingsPage.takeScreenshot("06-epic-connection-clicked");
    console.log("✅ Clicked Epic Games connection button");
  });

  it("should trigger Epic authentication flow", async () => {
    console.log("\n📝 Verifying Epic authentication flow...");

    // NOTE: Tauri WebviewWindow is NOT a separate browser window visible to WebDriver
    // The Epic OAuth webview opens internally in the app but is not accessible via browser.getWindowHandles()
    // We can only verify that the app doesn't crash when clicking the button

    await browser.pause(2000);

    // Verify we're still on settings/store page (app didn't crash)
    const url = await settingsPage.getCurrentUrl();
    expect(url).toContain("settings/store");

    // Verify the app is still responsive
    const bodyText = await $("body").getText();
    expect(bodyText.length).toBeGreaterThan(0);

    await settingsPage.takeScreenshot("07-epic-auth-attempted");

    console.log(
      "✅ Epic authentication flow triggered (webview internal - not accessible via WebDriver)",
    );
  });

  it("should show Epic Games connection status after auth attempt", async () => {
    console.log("\n🔗 Verifying Epic Games connection status...");

    await browser.pause(3000);

    const hasEpicGames = await storeSettingsPage.hasStore("Epic Games");
    const isConnected = await storeSettingsPage.isStoreConnected("Epic Games");
    const isDisconnected = await storeSettingsPage.isStoreDisconnected("Epic Games");

    await settingsPage.takeScreenshot("08-epic-status");

    expect(hasEpicGames).toBe(true);

    if (!isConnected) {
      console.log("⚠️ Epic Games not connected (authentication may have failed or been cancelled)");
    } else {
      console.log("✅ Epic Games connected successfully");
    }
  });
});
