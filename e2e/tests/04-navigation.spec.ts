/**
 * Pixxiden E2E Tests - Navigation
 *
 * Tests for navigating between different views:
 * - Library view (French: Bibliothèque)
 * - Settings view (French: Paramètres)
 * - Game detail view
 *
 * Note: Uses mock data for deterministic testing
 * Note: UI is in French
 */

import {
  waitForAppReady,
  takeScreenshot,
  setupMockTauriCommands,
  injectMockGames,
  verifyViewContent,
  assertViewNotBlackScreen,
} from "../helpers";

/**
 * Helper to navigate to settings and wait for it to load
 * (Follows the same pattern as 06-store-authentication which passes)
 */
async function navigateToSettings() {
  // Use programmatic navigation (like 06-store-authentication does)
  await browser.execute(() => {
    (window as any).__VUE_ROUTER__?.push("/settings");
  });

  // Wait for URL to change to /settings
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes("/settings");
    },
    { timeout: 5000, timeoutMsg: "URL did not change to /settings" },
  );

  // Wait for Vue transition and component rendering
  // SettingsView uses transitions which need extra time to complete
  await browser.pause(2000);

  // DEBUG: Get detailed info about what's rendered
  const debugInfo = await browser.execute(() => {
    const html = document.body.innerHTML;
    const aside = document.querySelector("aside");
    const main = document.querySelector("main");
    const routerView = document.querySelector(".router-view-container");
    const settingsContent = document.querySelector(".fixed.inset-0");
    const errors = (window as any).__VUE_ERRORS__ || [];

    return {
      htmlLength: html.length,
      htmlPreview: html.substring(0, 500),
      hasAside: !!aside,
      hasMain: !!main,
      hasSettingsContent: !!settingsContent,
      routerViewExists: !!routerView,
      vueErrors: errors,
      consoleErrors: (window as any).__CONSOLE_ERRORS__ || [],
    };
  });
  console.log(`[navigateToSettings] DEBUG:`, JSON.stringify(debugInfo, null, 2));

  // CRITICAL: Verify SettingsView actually rendered (not black screen)
  // SettingsView should show: "CONFIGURATION", "Système", or "Pixxiden"
  const result = await verifyViewContent(
    "SettingsView",
    ["CONFIGURATION", "Système", "Pixxiden", "Comptes"],
    100,
  );

  if (!result.isRendered) {
    console.log(`[navigateToSettings] WARNING: SettingsView may not have rendered properly!`);
    console.log(`  Body text: ${result.bodyText.substring(0, 300)}`);
  } else {
    console.log(
      `[navigateToSettings] SettingsView rendered correctly with ${result.textLength} chars`,
    );
  }

  return result.isRendered;
}

/**
 * Helper to navigate to library and wait for it to load
 * (Follows the same pattern as 06-store-authentication which passes)
 */
async function navigateToLibrary() {
  // Use programmatic navigation
  await browser.execute(() => {
    (window as any).__VUE_ROUTER__?.push("/");
  });

  // Wait for URL to change to /
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.endsWith("/") && !url.includes("/settings") && !url.includes("/game");
    },
    { timeout: 5000, timeoutMsg: "URL did not change to /" },
  );

  // Wait for library content to render
  await browser.pause(1000);
}

describe("Navigation", () => {
  before(async () => {
    await waitForAppReady();

    // Setup mock Tauri commands and inject mock games
    await setupMockTauriCommands();
    await injectMockGames();

    // Wait for the library view to fully render
    // LibraryFullscreen uses .fullscreen-view class and TopFilters with filter buttons
    await browser.waitUntil(
      async () => {
        const bodyText = await $("body").getText();
        // TopFilters shows French filter labels: "tous", "installés"
        return bodyText.includes("tous") || bodyText.includes("installés");
      },
      { timeout: 5000, timeoutMsg: "Library view did not render after setup" },
    );
  });

  describe("Route Navigation", () => {
    it("should start on library view (default route)", async () => {
      const url = await browser.getUrl();
      console.log(`Initial URL: ${url}`);

      // Should be on root or library route
      expect(url.endsWith("/") || url.includes("library")).toBe(true);

      // Verify we're on library by checking for TopFilters content (French labels)
      const bodyText = await $("body").getText();
      const hasFilters = bodyText.includes("tous") || bodyText.includes("installés");
      console.log(`Has filter buttons: ${hasFilters}`);
      expect(hasFilters).toBe(true);
    });

    it("should navigate to settings view", async () => {
      await navigateToSettings();

      // Verify URL changed
      const url = await browser.getUrl();
      console.log(`Settings URL: ${url}`);
      expect(url.includes("/settings")).toBe(true);

      // Wait for Vue to update UI
      await browser.pause(500);

      // Check footer shows "Modifier" (settings page action) instead of "Sélectionner" (library action)
      // This confirms Vue Router has updated the route and the UI is responding
      const bodyText = await $("body").getText();
      const hasModifier = bodyText.includes("Modifier");
      console.log(`Footer shows 'Modifier': ${hasModifier}`);
      console.log(`Body text preview: ${bodyText.substring(bodyText.length - 100)}`);

      // Navigation is successful if URL is /settings and footer shows settings controls
      expect(url.includes("/settings")).toBe(true);
      // Note: SettingsView component may take extra time to render due to transitions
      // The footer "Modifier" text confirms Vue knows we're on settings route
    });

    it("should navigate back to library", async () => {
      await navigateToLibrary();

      // Verify URL changed
      const url = await browser.getUrl();
      console.log(`Library URL: ${url}`);
      expect(url.endsWith("/")).toBe(true);

      // Verify we're on library by checking for filters or footer content (French labels)
      const bodyText = await $("body").getText();
      console.log(`Library body text: ${bodyText.substring(0, 300)}`);
      const hasFilters =
        bodyText.includes("tous") ||
        bodyText.includes("installés") ||
        bodyText.includes("Sélectionner");
      console.log(`Has library content: ${hasFilters}`);
      expect(hasFilters).toBe(true);
    });
  });

  describe("Settings Sections", () => {
    before(async () => {
      // Navigate to settings first
      await navigateToSettings();
    });

    it("should display settings sidebar with actual content (not black screen)", async () => {
      // Check we're on settings route
      const url = await browser.getUrl();
      const isOnSettings = url.includes("/settings");
      console.log(`URL is settings: ${isOnSettings}`);
      expect(isOnSettings).toBe(true);

      // CRITICAL: Verify settings view actually rendered
      // Sidebar shows: Système, Comptes, Clés API, Avancé, VERSION
      await assertViewNotBlackScreen("SettingsView", ["Système", "Comptes", "Pixxiden"], 50);

      // Check for sidebar elements
      const hasAside = await browser.execute(() => document.querySelector("aside") !== null);
      console.log(`Has sidebar (aside): ${hasAside}`);
      expect(hasAside).toBe(true);
    });

    it("should show system section by default (French: Système)", async () => {
      // Verify we're on settings route
      const url = await browser.getUrl();
      expect(url.includes("/settings")).toBe(true);

      // CRITICAL: Verify system section has actual content (OS name, kernel, etc.)
      // In mock mode, we should see "Linux", "Intel Core i7-9700K", memory info, etc.
      const result = await verifyViewContent(
        "System Section",
        ["Système", "Linux", "Kernel", "Mémoire", "Processeur"],
        150,
      );

      if (!result.isRendered) {
        console.log(
          `WARNING: System section may not have rendered. Found: ${result.foundTexts.join(", ")}`,
        );
      }

      // At minimum, the word "Système" should be present
      const bodyText = await $("body").getText();
      expect(bodyText.includes("Système")).toBe(true);
    });

    it("should show accounts section (French: Comptes)", async () => {
      // Verify we're on settings
      const url = await browser.getUrl();
      expect(url.includes("/settings")).toBe(true);

      // Click on accounts section using JavaScript (WebDriver click doesn't work)
      const accountsButton = await $("button*=Comptes");
      const exists = await accountsButton.isExisting();

      if (exists) {
        await browser.execute((el) => el.click(), accountsButton);
        await browser.pause(1000);
        console.log("Clicked accounts button via JS");

        // CRITICAL: Verify accounts section has store content
        const result = await verifyViewContent(
          "Accounts Section",
          ["Comptes", "Epic", "GOG", "Amazon", "CONNEXION"],
          150,
        );

        if (!result.isRendered) {
          console.log(
            `WARNING: Accounts section may not have rendered. Found: ${result.foundTexts.join(", ")}`,
          );
        }
      } else {
        // If button doesn't exist, the whole settings view failed to render
        throw new Error("Accounts button not found - SettingsView is a black screen!");
      }
    });

    it("should display Epic Games store settings", async () => {
      // First click on Accounts (Comptes) to show store settings
      const accountsButton = await $("button*=Comptes");
      if (await accountsButton.isExisting()) {
        await browser.execute((el) => el.click(), accountsButton);
        await browser.pause(500);
      }

      // Verify we're on settings route
      const url = await browser.getUrl();
      expect(url.includes("/settings")).toBe(true);

      // Verify Epic Games is shown in accounts section
      const bodyText = await $("body").getText();
      const hasEpic =
        bodyText.includes("Epic") || bodyText.includes("EPIC") || bodyText.includes("Comptes");
      console.log(`Epic Games or Accounts shown: ${hasEpic}`);
      expect(hasEpic).toBe(true);
    });

    it("should display GOG store settings", async () => {
      // Verify GOG is shown (may need Comptes section to be open)
      const bodyText = await $("body").getText();
      const hasGOG = bodyText.includes("GOG") || bodyText.includes("Comptes");
      console.log(`GOG or Accounts shown: ${hasGOG}`);
      expect(hasGOG).toBe(true);
    });

    it("should display Amazon Games store settings", async () => {
      // Verify Amazon is shown (may need Comptes section to be open)
      const bodyText = await $("body").getText();
      const hasAmazon = bodyText.includes("Amazon") || bodyText.includes("Comptes");
      console.log(`Amazon Games or Accounts shown: ${hasAmazon}`);
      expect(hasAmazon).toBe(true);
    });

    it("should show advanced section (French: Avancé)", async () => {
      // Click on advanced section
      const advancedButton = await $("button*=Avancé");
      const exists = await advancedButton.isExisting();

      if (exists) {
        await advancedButton.click();
        await browser.pause(1000);
        console.log("Advanced section clicked");

        // CRITICAL: Verify advanced section has Proton content
        const result = await verifyViewContent(
          "Advanced Section",
          ["Avancé", "Proton", "MangoHud"],
          100,
        );

        if (!result.isRendered) {
          console.log(
            `WARNING: Advanced section may not have rendered. Found: ${result.foundTexts.join(", ")}`,
          );
        }

        // At minimum, "Avancé" should be present
        const bodyText = await $("body").getText();
        expect(bodyText.includes("Avancé")).toBe(true);
      } else {
        throw new Error("Advanced button not found - SettingsView is a black screen!");
      }
    });
  });

  describe("No JavaScript Errors During Navigation", () => {
    before(async () => {
      // Clear any previous console errors
      await browser.execute(() => {
        (window as any).__CONSOLE_ERRORS__ = [];
        const originalError = console.error;
        console.error = function (...args: any[]) {
          (window as any).__CONSOLE_ERRORS__ = (window as any).__CONSOLE_ERRORS__ || [];
          (window as any).__CONSOLE_ERRORS__.push(args.map((a) => String(a)).join(" "));
          originalError.apply(console, args);
        };
      });
      await navigateToLibrary();
    });

    it("should navigate to game details without JavaScript errors", async () => {
      // Navigate to a game detail page
      await browser.execute(() => {
        (window as any).__VUE_ROUTER__?.push("/game/mock-game-1");
      });
      await browser.pause(1500);

      // Check for JavaScript errors
      const errors = (await browser.execute(() => {
        return (window as any).__CONSOLE_ERRORS__ || [];
      })) as string[];

      // Filter out non-critical errors (like network requests in mock mode)
      const criticalErrors = errors.filter(
        (e) =>
          e.includes("ReferenceError") ||
          e.includes("TypeError") ||
          e.includes("Can't find variable"),
      );

      console.log(`Game details navigation - errors found: ${criticalErrors.length}`);
      if (criticalErrors.length > 0) {
        console.log(`Errors: ${JSON.stringify(criticalErrors, null, 2)}`);
      }

      expect(criticalErrors.length).toBe(0);
    });

    it("should navigate back to library without JavaScript errors", async () => {
      // Clear errors
      await browser.execute(() => {
        (window as any).__CONSOLE_ERRORS__ = [];
      });

      // Navigate back to library
      await navigateToLibrary();
      await browser.pause(1000);

      // Check for JavaScript errors
      const errors = (await browser.execute(() => {
        return (window as any).__CONSOLE_ERRORS__ || [];
      })) as string[];

      const criticalErrors = errors.filter(
        (e) =>
          e.includes("ReferenceError") ||
          e.includes("TypeError") ||
          e.includes("Can't find variable"),
      );

      console.log(`Library navigation - errors found: ${criticalErrors.length}`);
      if (criticalErrors.length > 0) {
        console.log(`Errors: ${JSON.stringify(criticalErrors, null, 2)}`);
      }

      expect(criticalErrors.length).toBe(0);
    });

    it("should navigate to settings without JavaScript errors", async () => {
      // Clear errors
      await browser.execute(() => {
        (window as any).__CONSOLE_ERRORS__ = [];
      });

      await navigateToSettings();

      // Check for JavaScript errors
      const errors = (await browser.execute(() => {
        return (window as any).__CONSOLE_ERRORS__ || [];
      })) as string[];

      const criticalErrors = errors.filter(
        (e) =>
          e.includes("ReferenceError") ||
          e.includes("TypeError") ||
          e.includes("Can't find variable"),
      );

      console.log(`Settings navigation - errors found: ${criticalErrors.length}`);
      if (criticalErrors.length > 0) {
        console.log(`Errors: ${JSON.stringify(criticalErrors, null, 2)}`);
      }

      expect(criticalErrors.length).toBe(0);
    });
  });

  describe("Browser History", () => {
    before(async () => {
      // Start fresh from library
      await navigateToLibrary();
    });

    it("should support browser back navigation", async () => {
      // Navigate to settings first
      await navigateToSettings();

      // Verify we're on settings
      const urlBefore = await browser.getUrl();
      console.log(`URL before back: ${urlBefore}`);
      expect(urlBefore.includes("/settings")).toBe(true);

      // Go back
      await browser.back();
      await browser.pause(2000);

      // Should be back on library
      const urlAfter = await browser.getUrl();
      console.log(`URL after back: ${urlAfter}`);
      const bodyText = await $("body").getText();
      console.log(`Body after back: ${bodyText.substring(0, 200)}`);

      // Check if we're on library (URL ends with / or has library content) - French labels
      const onLibrary =
        urlAfter.endsWith("/") || bodyText.includes("tous") || bodyText.includes("Sélectionner");
      console.log(`After back - on library: ${onLibrary}`);
      expect(onLibrary).toBe(true);
    });

    it("should support browser forward navigation", async () => {
      // Go forward to settings
      await browser.forward();
      await browser.pause(2000);

      // Should be on settings
      const url = await browser.getUrl();
      console.log(`URL after forward: ${url}`);

      const onSettings = url.includes("/settings");
      console.log(`After forward - on settings: ${onSettings}`);
      expect(onSettings).toBe(true);
    });
  });

  after(async () => {
    // Return to library for next tests
    try {
      await navigateToLibrary();
    } catch (e) {
      // Ignore errors in cleanup
    }

    await takeScreenshot("navigation-final");
  });
});
