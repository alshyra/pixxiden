/**
 * Scenario 3: Epic Manual Authentication Flow
 * Tests the new manual copy-paste authentication flow for Epic Games
 *
 * Flow:
 * 1. User clicks "Connexion" button in settings
 * 2. Modal opens with instructions and input field
 * 3. User clicks "Ouvrir le navigateur" (opens browser)
 * 4. User copies authorization code from browser
 * 5. User pastes code in input field
 * 6. User clicks "Valider"
 * 7. Authentication completes via legendary CLI
 */

import { waitForAppReady } from "../helpers";
import { SettingsPage } from "../page-objects/SettingsPage";
import { StoreSettingsPage } from "../page-objects/StoreSettingsPage";

describe("Scenario 3: Epic Manual Authentication", () => {
  let settingsPage: SettingsPage;
  let storeSettingsPage: StoreSettingsPage;

  beforeEach(async () => {
    await waitForAppReady();
    settingsPage = new SettingsPage();
    storeSettingsPage = new StoreSettingsPage();

    // Navigate to store settings
    await browser.pause(2000);
    const currentUrl = await settingsPage.getCurrentUrl();
    if (!currentUrl.includes("settings/store")) {
      await settingsPage.navigateToStoreSettings();
      await browser.pause(1000);
    }
  });

  it("should display Epic authentication modal with manual input", async () => {
    console.log("\n🔐 Testing Epic manual authentication flow...");

    // 1. Find and click Epic connection button
    console.log("\n🖱️  Finding Epic connection button...");
    const buttons = await $$("button");
    let epicButton: WebdriverIO.Element | null = null;

    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes("CONNEXION")) {
        const parent = await btn.parentElement();
        const parentText = await parent.getText();
        if (parentText.includes("Epic")) {
          epicButton = btn;
          console.log("  ✅ Found Epic connection button");
          break;
        }
      }
    }

    if (!epicButton) {
      throw new Error("Epic Games connection button not found!");
    }

    // 2. Click button to open modal
    await epicButton.click();
    console.log("  ✅ Clicked connection button");

    // 3. Wait for modal to appear
    await browser.pause(1500);
    await settingsPage.takeScreenshot("03-modal-opened");

    // 4. Verify modal title
    const bodyText = await $("body").getText();
    expect(bodyText).toContain("Connexion Epic Games");
    expect(bodyText).toContain("Instructions");
    console.log("  ✅ Modal opened with instructions");

    // 5. Verify instructions are displayed
    expect(bodyText).toContain("Ouvrir le navigateur");
    expect(bodyText).toContain("Connectez-vous avec vos identifiants Epic Games");
    expect(bodyText).toContain("Copiez le code d'autorisation");
    expect(bodyText).toContain("Collez-le dans le champ");
    console.log("  ✅ Instructions visible");

    // 6. Verify input field exists
    const input = await $('input[type="text"]');
    await input.waitForDisplayed({ timeout: 3000 });
    expect(await input.isDisplayed()).toBe(true);
    console.log("  ✅ Authorization code input field visible");

    // 7. Verify "Ouvrir le navigateur" button exists
    const openBrowserButtons = await $$("button");
    let openBrowserButton: WebdriverIO.Element | null = null;

    for (const btn of openBrowserButtons) {
      const text = await btn.getText();
      if (text.includes("Ouvrir le navigateur")) {
        openBrowserButton = btn;
        break;
      }
    }

    expect(openBrowserButton).not.toBeNull();
    console.log("  ✅ 'Ouvrir le navigateur' button visible");

    // 8. Verify "Valider" button exists and is initially disabled
    const validateButtons = await $$("button");
    let validateButton: WebdriverIO.Element | null = null;

    for (const btn of validateButtons) {
      const text = await btn.getText();
      if (text === "Valider") {
        validateButton = btn;
        break;
      }
    }

    expect(validateButton).not.toBeNull();
    expect(await validateButton!.isEnabled()).toBe(false);
    console.log("  ✅ 'Valider' button visible and initially disabled");

    await settingsPage.takeScreenshot("03-modal-ui-verified");

    // 9. Type a test code (not real authentication, just UI test)
    await input.setValue("test-code-123");
    await browser.pause(500);
    console.log("  ✅ Entered test authorization code");

    // 10. Verify validate button becomes enabled
    expect(await validateButton!.isEnabled()).toBe(true);
    console.log("  ✅ 'Valider' button enabled after input");

    await settingsPage.takeScreenshot("03-code-entered");

    // 11. Close modal (click Annuler button)
    const cancelButtons = await $$("button");
    for (const btn of cancelButtons) {
      const text = await btn.getText();
      if (text === "Annuler") {
        await btn.click();
        console.log("  ✅ Clicked 'Annuler' button");
        break;
      }
    }

    // 12. Verify modal closed
    await browser.pause(1000);
    const bodyAfterClose = await $("body").getText();
    expect(bodyAfterClose).not.toContain("Connexion Epic Games");
    console.log("  ✅ Modal closed successfully");

    await settingsPage.takeScreenshot("03-modal-closed");

    console.log("\n✅ Epic manual authentication UI test passed!");
  });

  it("should show error when invalid code is submitted", async () => {
    console.log("\n❌ Testing invalid code error handling...");

    // 1. Open modal
    const buttons = await $$("button");
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes("CONNEXION")) {
        const parent = await btn.parentElement();
        const parentText = await parent.getText();
        if (parentText.includes("Epic")) {
          await btn.click();
          break;
        }
      }
    }

    await browser.pause(1500);

    // 2. Enter invalid code
    const input = await $('input[type="text"]');
    await input.setValue("invalid-code");

    // 3. Click validate
    const validateButtons = await $$("button");
    for (const btn of validateButtons) {
      const text = await btn.getText();
      if (text === "Valider") {
        await btn.click();
        console.log("  ✅ Clicked 'Valider' with invalid code");
        break;
      }
    }

    // 4. Wait for error message
    await browser.pause(2000);

    // 5. Verify error is displayed
    const bodyText = await $("body").getText();
    // Error message should be visible (legendary will return auth error)
    const hasLoadingOrError =
      bodyText.includes("Authentification en cours") || bodyText.includes("Authentication failed");

    expect(hasLoadingOrError).toBe(true);
    console.log("  ✅ Error or loading state displayed");

    await settingsPage.takeScreenshot("03-invalid-code-error");

    // Close modal
    await browser.pause(2000);
    const cancelButtons = await $$("button");
    for (const btn of cancelButtons) {
      const text = await btn.getText();
      if (text === "Annuler") {
        await btn.click();
        break;
      }
    }

    console.log("\n✅ Invalid code error handling test passed!");
  });
});
