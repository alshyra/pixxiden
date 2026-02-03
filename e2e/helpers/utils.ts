/**
 * Pixxiden E2E Test Utilities
 *
 * Helper functions for interacting with the Tauri app via WebDriver.
 * Uses real store binaries (legendary, gogdl, nile) for integration testing.
 */

/**
 * Ensure we're on a valid window (not a closed one)
 * This is important because the splashscreen window can close at any time
 */
export async function ensureValidWindow(): Promise<boolean> {
  try {
    // Test if current window is still valid
    await browser.getUrl();
    return true;
  } catch (e) {
    // Current window is closed, try to find and switch to a valid one
    console.log("[ensureValidWindow] Current window is invalid, finding a new one...");
    const handles = await browser.getWindowHandles();

    for (const handle of handles) {
      try {
        await browser.switchToWindow(handle);
        const url = await browser.getUrl();

        // Prefer non-splashscreen windows
        if (!url.includes("?splash")) {
          console.log(`[ensureValidWindow] Switched to main window: ${handle.substring(0, 20)}`);
          return true;
        }
      } catch {
        continue;
      }
    }

    // If we only have splashscreen, use that
    if (handles.length > 0) {
      await browser.switchToWindow(handles[0]);
      console.log(
        `[ensureValidWindow] Switched to fallback window: ${handles[0].substring(0, 20)}`,
      );
      return true;
    }

    console.log("[ensureValidWindow] No valid windows found");
    return false;
  }
}

/**
 * Wait for element to be displayed and return it
 */
export async function waitForElement(
  selector: string,
  timeout = 5000,
): Promise<WebdriverIO.Element> {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  return element;
}

/**
 * Wait for element and click it
 */
export async function clickElement(selector: string, timeout = 5000): Promise<void> {
  const element = await waitForElement(selector, timeout);
  await element.click();
}

/**
 * Wait for element and get its text
 */
export async function getElementText(selector: string, timeout = 5000): Promise<string> {
  const element = await waitForElement(selector, timeout);
  return element.getText();
}

/**
 * Check if element exists and is displayed
 */
export async function isElementDisplayed(selector: string, timeout = 5000): Promise<boolean> {
  try {
    const element = await $(selector);
    await element.waitForDisplayed({ timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for multiple elements
 */
export async function waitForElements(
  selector: string,
  timeout = 5000,
): Promise<WebdriverIO.ElementArray> {
  await browser.waitUntil(
    async () => {
      const elements = await $$(selector);
      return elements.length > 0;
    },
    { timeout, timeoutMsg: `Elements ${selector} not found` },
  );
  return $$(selector);
}

/**
 * Count elements matching selector
 */
export async function countElements(selector: string): Promise<number> {
  const elements = await $$(selector);
  return elements.length;
}

/**
 * Navigate to a route in the app
 */
export async function navigateTo(route: string): Promise<void> {
  // Just click the navigation element instead of hacking routes
  if (route === "/") {
    // Click home/library button
    const homeBtn = await $(
      '[data-testid="nav-home"], [data-testid="nav-library"], .nav-home, .nav-library',
    );
    if (await homeBtn.isExisting()) {
      await homeBtn.click();
    }
  } else if (route.includes("settings")) {
    // Click settings button
    const settingsBtn = await $('[data-testid="nav-settings"], .nav-settings');
    if (await settingsBtn.isExisting()) {
      await settingsBtn.click();
    }
  }

  await browser.pause(500);
}

/**
 * Wait for app to be fully loaded and switch to the MAIN window (not splashscreen)
 */
export async function waitForAppReady(timeout = 30000): Promise<void> {
  console.log("[waitForAppReady] Getting window handles...");

  // Wait for at least one window to be available
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > 0;
    },
    { timeout: 10000, timeoutMsg: "No windows found" },
  );

  let mainWindowHandle: string | null = null;

  // Try to find the main window (not splashscreen)
  // The main window URL is "tauri://localhost/" without "?splash"
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      console.log(`[waitForAppReady] Found ${handles.length} window handles`);

      for (const handle of handles) {
        try {
          await browser.switchToWindow(handle);
          const url = await browser.getUrl();
          console.log(`[waitForAppReady] Window ${handle.substring(0, 20)}: url="${url}"`);

          // Main window does NOT have ?splash in URL
          const isSplashscreen = url.includes("?splash");

          if (!isSplashscreen) {
            // Verify this window has #app
            const app = await $("#app");
            const exists = await app.isExisting();
            if (exists) {
              console.log(`[waitForAppReady] Found MAIN window: ${handle.substring(0, 20)}`);
              mainWindowHandle = handle;
              return true;
            }
          }
        } catch (e) {
          // Window might have closed, skip it
          console.log(
            `[waitForAppReady] Error checking window ${handle.substring(0, 20)}: ${(e as Error).message}`,
          );
        }
      }
      return false;
    },
    {
      timeout,
      timeoutMsg: "Could not find main window with #app",
      interval: 500,
    },
  );

  // Make sure we're on the main window
  if (mainWindowHandle) {
    await browser.switchToWindow(mainWindowHandle);
    console.log(`[waitForAppReady] Switched to main window: ${mainWindowHandle.substring(0, 20)}`);
  }

  // Wait for the app to be displayed
  await browser.waitUntil(
    async () => {
      const app = await $("#app");
      return app.isDisplayed();
    },
    { timeout: 5000, timeoutMsg: "App #app not displayed" },
  );

  // Additional wait for Vue to fully initialize
  await browser.pause(1000);
  console.log("[waitForAppReady] App ready!");
}

/**
 * Get all visible game cards
 */
export async function getGameCards(): Promise<WebdriverIO.ElementArray> {
  return $$('[data-testid="game-card"]');
}

/**
 * Get game card by title
 */
export async function getGameCardByTitle(title: string): Promise<WebdriverIO.Element | null> {
  const cards = await getGameCards();
  for (const card of cards) {
    const cardTitle = await card.$('[data-testid="game-title"]');
    if (await cardTitle.isExisting()) {
      const text = await cardTitle.getText();
      if (text.includes(title)) {
        return card;
      }
    }
  }
  return null;
}

/**
 * Trigger library sync and wait for completion
 */
export async function syncLibrary(timeout = 6000): Promise<void> {
  const syncButton = await $('[data-testid="sync-button"]');
  await syncButton.click();

  // Wait for sync to complete (button should stop spinning)
  await browser.waitUntil(
    async () => {
      const isSpinning = await syncButton.getAttribute("class");
      return !isSpinning?.includes("syncing");
    },
    { timeout, timeoutMsg: "Library sync did not complete in time" },
  );
}

/**
 * Filter games by store
 */
export async function filterByStore(store: "all" | "epic" | "gog" | "amazon"): Promise<void> {
  const filterButton = await $(`[data-testid="store-filter-${store}"]`);
  await filterButton.click();
  await browser.pause(300); // Wait for filter animation
}

/**
 * Sort games by criteria
 */
export async function sortGamesBy(criteria: "title" | "playtime" | "recent"): Promise<void> {
  const sortSelect = await $('[data-testid="sort-select"]');
  await sortSelect.selectByAttribute("value", criteria);
  await browser.pause(300);
}

/**
 * Get store connection status from settings
 */
export async function getStoreStatus(store: "legendary" | "gogdl" | "nile"): Promise<{
  available: boolean;
  authenticated: boolean;
}> {
  const statusElement = await $(`[data-testid="store-status-${store}"]`);
  const isConnected = await statusElement.$(".connected");
  const isAvailable = await statusElement.$(".available");

  return {
    available: await isAvailable.isExisting(),
    authenticated: await isConnected.isExisting(),
  };
}

/**
 * Take a screenshot for debugging
 * Handles "no such window" errors gracefully
 * Has a 10-second timeout to prevent hanging on WebDriver issues
 */
export async function takeScreenshot(name: string): Promise<void> {
  try {
    // First, make sure we're on a valid window
    const handles = await browser.getWindowHandles();
    if (handles.length === 0) {
      console.log(`[takeScreenshot] No windows available, skipping screenshot: ${name}`);
      return;
    }

    // Try to switch to first available window if current one is closed
    try {
      await browser.getUrl(); // Test if current window is valid
    } catch {
      // Current window is closed, switch to first available
      await browser.switchToWindow(handles[0]);
    }

    // Use Promise.race to add a timeout to screenshot capture
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPromise = browser.saveScreenshot(`./e2e/screenshots/${name}-${timestamp}.png`);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Screenshot timeout")), 10000),
    );

    await Promise.race([screenshotPromise, timeoutPromise]);
  } catch (error) {
    console.log(
      `[takeScreenshot] Failed to take screenshot '${name}': ${(error as Error).message}`,
    );
  }
}

/**
 * Verify that a view has meaningful content (not a black screen)
 * This checks for visible text content beyond just basic navigation elements
 * @param viewName Name of the view for logging purposes
 * @param requiredTexts Array of text strings that should be present
 * @param minTextLength Minimum total text length to consider the view as "rendered"
 * @returns Object with isRendered status and debug info
 */
export async function verifyViewContent(
  viewName: string,
  requiredTexts: string[] = [],
  minTextLength = 50,
): Promise<{ isRendered: boolean; textLength: number; foundTexts: string[]; bodyText: string }> {
  // Get body text
  const bodyText = await $("body").getText();
  const textLength = bodyText.length;

  // Check for required texts
  const foundTexts = requiredTexts.filter((text) =>
    bodyText.toLowerCase().includes(text.toLowerCase()),
  );

  // A view is considered rendered if:
  // 1. Has minimum text content (not just empty/blank)
  // 2. Has found some of the required texts (if specified)
  const hasMinContent = textLength >= minTextLength;
  const hasRequiredContent = requiredTexts.length === 0 || foundTexts.length > 0;
  const isRendered = hasMinContent && hasRequiredContent;

  console.log(`[verifyViewContent] ${viewName}:`);
  console.log(`  - Text length: ${textLength} (min: ${minTextLength})`);
  console.log(`  - Required texts found: ${foundTexts.length}/${requiredTexts.length}`);
  console.log(`  - Found: ${foundTexts.join(", ") || "none"}`);
  console.log(`  - Is rendered: ${isRendered}`);

  if (!isRendered) {
    console.log(`  - Body text preview: ${bodyText.substring(0, 200)}...`);
  }

  return { isRendered, textLength, foundTexts, bodyText };
}

/**
 * Assert that a view is properly rendered (not a black screen)
 * Throws an error if the view is not rendered
 */
export async function assertViewNotBlackScreen(
  viewName: string,
  requiredTexts: string[] = [],
  minTextLength = 50,
): Promise<void> {
  const result = await verifyViewContent(viewName, requiredTexts, minTextLength);

  if (!result.isRendered) {
    // Take a screenshot for debugging
    await takeScreenshot(`black-screen-${viewName}`);

    throw new Error(
      `${viewName} appears to be a black screen! ` +
        `Text length: ${result.textLength}, ` +
        `Required texts found: ${result.foundTexts.length}/${requiredTexts.length}. ` +
        `Body preview: "${result.bodyText.substring(0, 100)}..."`,
    );
  }
}

/**
 * Execute Tauri command via IPC
 */
export async function invokeTauriCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return browser.execute(
    async (cmd: string, cmdArgs: Record<string, unknown> | undefined) => {
      const { invoke } = await import("@tauri-apps/api/core");
      return invoke(cmd, cmdArgs);
    },
    command,
    args,
  ) as Promise<T>;
}

/**
 * Check if a CLI binary is available
 */
export async function isBinaryAvailable(binary: "legendary" | "gogdl" | "nile"): Promise<boolean> {
  const status = await invokeTauriCommand<Array<{ name: string; available: boolean }>>(
    "get_store_status",
  );
  const store = status.find(
    (s) =>
      s.name === binary ||
      (binary === "legendary" && s.name === "epic") ||
      (binary === "gogdl" && s.name === "gog"),
  );
  return store?.available ?? false;
}
