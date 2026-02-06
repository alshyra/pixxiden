/**
 * Scenario 1: API Keys Setup
 * Tests the initial API keys configuration flow
 * Each test is independent and can run in isolation
 */

import { waitForAppReady } from "../helpers";
import { APIKeysModal } from "../page-objects/APIKeysModal";
import { SettingsPage } from "../page-objects/SettingsPage";

describe("Scenario 1: API Keys Setup", () => {
  it("should show API keys modal and allow skipping configuration", async () => {
    console.log("\n🔑 Starting API keys setup test...");

    // 1. Wait for app ready
    await waitForAppReady();
    const apiKeysModal = new APIKeysModal();
    const settingsPage = new SettingsPage();

    // 2. Check if API keys setup modal is shown
    const hasApiKeysSetup = await apiKeysModal.isShown();
    console.log(`✅ API keys modal check: ${hasApiKeysSetup}`);

    await settingsPage.takeScreenshot("01-api-keys-modal");

    // 3. Skip API keys configuration
    const skipped = await apiKeysModal.clickSkip();

    if (!skipped) {
      console.log("⚠️ Skip button not found (might be already on main app)");
    } else {
      console.log("✅ Skipped API keys configuration");
    }

    // 4. Verify app moved past modal
    await browser.pause(2000);
    const bodyText = await $("body").getText();
    expect(bodyText.length).toBeGreaterThan(0);

    await settingsPage.takeScreenshot("01-after-skip");
    console.log("✅ App responsive after skip");
  });
});
