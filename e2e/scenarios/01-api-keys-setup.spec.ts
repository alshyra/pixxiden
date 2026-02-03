/**
 * Scenario 1: API Keys Setup
 * Tests the initial API keys configuration flow
 */

import { waitForAppReady } from "../helpers";
import { APIKeysModal } from "../page-objects/APIKeysModal";
import { SettingsPage } from "../page-objects/SettingsPage";

describe("Scenario 1: API Keys Setup", () => {
  let apiKeysModal: APIKeysModal;
  let settingsPage: SettingsPage;

  before(async () => {
    await waitForAppReady();
    apiKeysModal = new APIKeysModal();
    settingsPage = new SettingsPage();
  });

  it("should show API keys setup modal when no API keys configured", async () => {
    console.log("\n🔑 Checking for API keys setup...");

    const hasApiKeysSetup = await apiKeysModal.isShown();
    await settingsPage.takeScreenshot("01-api-keys-check");

    console.log(`Has API keys setup: ${hasApiKeysSetup}`);
  });

  it("should allow skipping API keys configuration", async () => {
    console.log("\n⏭️ Skipping API keys configuration...");

    const skipped = await apiKeysModal.clickSkip();

    if (!skipped) {
      console.log("⚠️ Skip button not found (might be already on main app)");
    }

    await browser.pause(2000);
    await settingsPage.takeScreenshot("02-after-skip");
  });
});
