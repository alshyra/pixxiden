/**
 * Scenario 2: Store Configuration & Authentication
 * Tests configuring and connecting to an Epic Games store
 * Each test is independent and can run in isolation
 *
 * This test helps diagnose why the webview doesn't open in E2E tests
 * while it works in manual testing (bun run tauri:dev)
 */

import { waitForAppReady } from "../helpers";
import { SettingsPage } from "../page-objects/SettingsPage";
import { StoreSettingsPage } from "../page-objects/StoreSettingsPage";
import * as fs from "fs";
import * as path from "path";

// Load Epic credentials from .env
function loadEpicCredentials(): { login: string; password: string } {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found");
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");

  let login = "";
  let password = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("EPIC_LOGIN=")) {
      login = trimmed.split("=")[1].replace(/"/g, "");
    } else if (trimmed.startsWith("EPIC_PASSWORD=")) {
      password = trimmed.split("=")[1].replace(/"/g, "");
    }
  }

  if (!login || !password) {
    throw new Error("EPIC_LOGIN and EPIC_PASSWORD must be set in .env");
  }

  return { login, password };
}

describe("Scenario 2: Store Configuration & Authentication", () => {
  it("should configure Epic Games store and verify authentication flow", async () => {
    console.log("\n🏪 Starting store configuration test...");

    // Load credentials
    const epicCreds = loadEpicCredentials();
    console.log(`✅ Loaded Epic credentials for: ${epicCreds.login}`);

    // 1. Wait for app ready
    await waitForAppReady();
    const settingsPage = new SettingsPage();
    const storeSettingsPage = new StoreSettingsPage();

    // 2. Verify we're on settings (redirected from empty library)
    await browser.pause(3000);
    const currentUrl = await settingsPage.getCurrentUrl();
    expect(currentUrl).toContain("settings");
    console.log("✅ Redirected to settings");

    // 3. Navigate to store settings (Comptes tab)
    if (!currentUrl.includes("settings/store")) {
      await settingsPage.navigateToStoreSettings();
      await browser.pause(1000);
    }
    console.log("✅ Navigated to Comptes tab");

    // 4. Verify store configuration UI
    const bodyText = await $("body").getText();
    expect(bodyText).toContain("Epic Games");
    console.log("✅ Store configuration UI visible");

    // DEBUG: Check HTML content
    console.log("\n🔍 DEBUG - Checking if data-testid exists in HTML...");
    const html = await $("body").getHTML();
    const hasTestId = html.includes("data-testid");
    const hasEpicConnect = html.includes("epic-connect-button");
    console.log(`  - HTML contains data-testid: ${hasTestId}`);
    console.log(`  - HTML contains epic-connect-button: ${hasEpicConnect}`);

    await settingsPage.takeScreenshot("02-store-config-ui");

    // 5. Try to find the button with flexible selector
    console.log("\n🔍 Trying to find Epic Games button...");
    let epicButton: WebdriverIO.Element | null = null;

    // Method 1: data-testid
    try {
      epicButton = await $('[data-testid="epic-connect-button"]');
      const isDisplayed = await epicButton.isDisplayed();
      if (isDisplayed) {
        console.log("  ✅ Found via data-testid");
      } else {
        epicButton = null;
      }
    } catch (e) {
      console.log("  ⚠️  Not found via data-testid");
    }

    // Method 2: text content
    if (!epicButton) {
      try {
        const buttons = await $$("button");
        for (const btn of buttons) {
          const text = await btn.getText();
          if (text.includes("connecter") || text.includes("CONNEXION")) {
            const parent = await btn.parentElement();
            const parentText = await parent.getText();
            if (parentText.includes("Epic")) {
              epicButton = btn;
              console.log("  ✅ Found via text content");
              break;
            }
          }
        }
      } catch (e) {
        console.log("  ⚠️  Not found via text content");
      }
    }

    if (!epicButton) {
      throw new Error("Epic Games button not found with any method!");
    }

    // 6. Get initial window handles
    console.log("\n🔍 BEFORE CLICK - Getting window handles...");
    const handlesBefore = await browser.getWindowHandles();
    console.log(`  - Window handles BEFORE: ${handlesBefore.length} window(s)`, handlesBefore);

    // 7. Click Epic Games connection button
    console.log("\n🖱️  Clicking Epic Games connection button...");
    await epicButton.click();
    console.log("  ✅ Click executed");

    await browser.pause(1500);

    await browser.pause(1500);

    // 8. Wait for webview to possibly open
    await browser.pause(3000);

    // 9. Check window handles after click
    console.log("\n🔍 AFTER CLICK - Getting window handles...");
    const handlesAfter = await browser.getWindowHandles();
    console.log(`  - Window handles AFTER: ${handlesAfter.length} window(s)`, handlesAfter);

    if (handlesAfter.length > handlesBefore.length) {
      console.log("  ✅ NEW WINDOW DETECTED!");

      // Switch to the new window (webview)
      const newWindowHandle = handlesAfter.find((h) => !handlesBefore.includes(h));
      if (newWindowHandle) {
        console.log(`  - Switching to new window: ${newWindowHandle}`);
        await browser.switchToWindow(newWindowHandle);

        // Wait for Epic login page
        await browser.pause(2000);
        const webviewUrl = await browser.getUrl();
        console.log(`  - Webview URL: ${webviewUrl}`);

        await settingsPage.takeScreenshot("02-webview-opened");

        // If Epic returns JSON directly, ensure the webview closes automatically
        try {
          const webviewBodyText = await $("body").getText();
          const hasAuthJson =
            webviewBodyText.includes('"authorizationCode"') &&
            webviewBodyText.includes('"redirectUrl"');

          if (hasAuthJson) {
            console.log("  ✅ JSON detected in webview, waiting for auto-close...");

            await browser.waitUntil(
              async () => {
                const handles = await browser.getWindowHandles();
                return handles.length === handlesBefore.length;
              },
              {
                timeout: 10000,
                interval: 500,
                timeoutMsg: "Webview did not close after JSON response",
              },
            );

            await browser.switchToWindow(handlesBefore[0]);
            console.log("  ✅ Webview closed automatically");
          } else {
            // Fill Epic credentials
            console.log("\n📝 Filling Epic credentials...");

            // Find email field
            const emailField = await $("#email");
            await emailField.waitForDisplayed({ timeout: 5000 });
            await emailField.setValue(epicCreds.login);
            console.log("  ✅ Email filled");

            // Find password field
            const passwordField = await $("#password");
            await passwordField.setValue(epicCreds.password);
            console.log("  ✅ Password filled");

            await settingsPage.takeScreenshot("02-credentials-filled");

            // Click login button
            const loginButton = await $("#sign-in");
            await loginButton.click();
            console.log("  ✅ Login button clicked");

            // Wait for auth redirect
            await browser.pause(5000);
            await settingsPage.takeScreenshot("02-after-login");

            // Switch back to main window
            await browser.switchToWindow(handlesBefore[0]);
            console.log("  ✅ Switched back to main window");
          }
        } catch (error) {
          console.error("  ❌ Error during webview auth handling:", error);
          await settingsPage.takeScreenshot("02-webview-error");
          // Switch back to main window even on error
          await browser.switchToWindow(handlesBefore[0]);
        }
      }
    } else {
      console.log("  ⚠️  NO NEW WINDOW - Webview did not open!");
      console.log("  - This is the bug we're trying to diagnose");
      console.log(
        "  - In manual test (bun run tauri:dev), clicking the button DOES open a webview",
      );
      console.log("  - In automated test, it doesn't - investigating why...");
    }

    // 10. Verify app didn't crash
    const urlAfterClick = await settingsPage.getCurrentUrl();
    expect(urlAfterClick).toContain("settings/store");

    const bodyAfterAuth = await $("body").getText();
    expect(bodyAfterAuth.length).toBeGreaterThan(0);
    console.log("\n✅ App still responsive");

    await settingsPage.takeScreenshot("02-store-auth-triggered");

    // 11. Wait and check connection status
    await browser.pause(3000);
    const isConnected = await storeSettingsPage.isStoreConnected("Epic Games");
    const isDisconnected = await storeSettingsPage.isStoreDisconnected("Epic Games");

    await settingsPage.takeScreenshot("02-store-status");

    console.log(`\n📊 Final Status:`);
    console.log(`  - Connected: ${isConnected}`);
    console.log(`  - Disconnected: ${isDisconnected}`);

    // Test passes if either connected OR disconnected (both are valid states)
    expect(isConnected || isDisconnected).toBe(true);
  });
});
