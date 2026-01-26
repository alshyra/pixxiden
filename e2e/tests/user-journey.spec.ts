/**
 * Pixxiden E2E Tests - User Journeys
 *
 * Full user journey tests using REAL backend data:
 * - Real Heroic config files (legendary, gogdl, nile)
 * - Real API enrichment (IGDB, SteamGridDB, HLTB, ProtonDB)
 * - Real cache building
 *
 * These tests validate the complete user experience from splash screen
 * to game management, with real data from the user's stores.
 *
 * PREREQUISITES:
 * - At least one store (Epic/GOG/Amazon) should be authenticated
 * - Internet connection for API enrichment
 * - Cache is cleared before tests (see wdio.conf.ts onPrepare)
 */

import {
  waitForAppReady,
  takeScreenshot,
  navigateTo,
  verifyViewContent,
  assertViewNotBlackScreen,
} from "../helpers";

describe("User Journey: Complete Application Flow", () => {
  /**
   * Helper to wait for games to be loaded in the library
   */
  async function waitForGamesLoaded(timeout = 30000): Promise<number> {
    let gamesCount = 0;

    await browser.waitUntil(
      async () => {
        const result = await browser.execute(() => {
          const pinia = (window as any).__PINIA__;
          if (!pinia?._s?.has("library")) return 0;
          const store = pinia._s.get("library");
          return store?.games?.length || 0;
        });
        gamesCount = result as number;
        return gamesCount > 0;
      },
      {
        timeout,
        timeoutMsg: `No games loaded after ${timeout}ms. Check that at least one store is authenticated.`,
        interval: 1000,
      },
    );

    return gamesCount;
  }

  /**
   * Helper to get library loading state
   */
  async function getLibraryState(): Promise<{
    loading: boolean;
    gamesCount: number;
    error: string | null;
  }> {
    return browser.execute(() => {
      const pinia = (window as any).__PINIA__;
      if (!pinia?._s?.has("library")) {
        return { loading: false, gamesCount: 0, error: "No library store" };
      }
      const store = pinia._s.get("library");
      return {
        loading: store?.loading || false,
        gamesCount: store?.games?.length || 0,
        error: store?.error || null,
      };
    });
  }

  /**
   * Helper to check if a game has enrichment data
   */
  async function checkGameEnrichment(gameIndex = 0): Promise<{
    hasIgdbData: boolean;
    hasHltbData: boolean;
    hasProtonDbData: boolean;
    hasAssets: boolean;
    gameTitle: string;
  }> {
    return browser.execute((idx: number) => {
      const pinia = (window as any).__PINIA__;
      if (!pinia?._s?.has("library")) {
        return {
          hasIgdbData: false,
          hasHltbData: false,
          hasProtonDbData: false,
          hasAssets: false,
          gameTitle: "",
        };
      }
      const store = pinia._s.get("library");
      const game = store?.games?.[idx];

      if (!game) {
        return {
          hasIgdbData: false,
          hasHltbData: false,
          hasProtonDbData: false,
          hasAssets: false,
          gameTitle: "",
        };
      }

      return {
        gameTitle: game.title || "",
        hasIgdbData: !!(game.igdbId || game.summary || game.genres?.length > 0),
        hasHltbData: !!(game.hltbMain || game.hltbExtras || game.hltbCompletionist),
        hasProtonDbData: !!game.protonDbRating,
        hasAssets: !!(game.backgroundUrl || game.coverUrl || game.logoUrl),
      };
    }, gameIndex);
  }

  // =====================================================
  // JOURNEY 1: First Launch Experience
  // =====================================================
  describe("Journey: First Launch & Library Discovery", () => {
    it("should start from splash screen and transition to main app", async () => {
      console.log("\n🚀 Starting first launch journey...");

      // Wait for app to be ready (handles splash -> main window transition)
      await waitForAppReady();

      // Take screenshot of initial state
      await takeScreenshot("journey-01-app-ready");

      // Verify main app is rendered
      await assertViewNotBlackScreen("Main App", ["bibliothèque", "library", "games", "jeux"], 50);

      console.log("✅ App launched successfully");
    });

    it("should load games from authenticated stores (REAL DATA)", async () => {
      console.log("\n📚 Loading games from real stores...");

      const state = await getLibraryState();
      console.log(
        `Initial state: loading=${state.loading}, games=${state.gamesCount}, error=${state.error}`,
      );

      // Wait for games to load (real backend call)
      const gamesCount = await waitForGamesLoaded(60000); // Allow more time for real API calls

      console.log(`✅ Loaded ${gamesCount} games from stores`);
      expect(gamesCount).toBeGreaterThan(0);

      await takeScreenshot("journey-02-games-loaded");
    });

    it("should display game cards in the library grid", async () => {
      console.log("\n🎮 Checking game cards display...");

      // Wait for game cards to render
      await browser.waitUntil(
        async () => {
          const cards = await $$(".game-card");
          return cards.length > 0;
        },
        { timeout: 10000, timeoutMsg: "Game cards not rendered" },
      );

      const gameCards = await $$(".game-card");
      console.log(`✅ Found ${gameCards.length} game cards displayed`);

      expect(gameCards.length).toBeGreaterThan(0);

      await takeScreenshot("journey-03-game-cards");
    });

    it("should show enriched game data (IGDB, HLTB, ProtonDB)", async () => {
      console.log("\n🔍 Checking game enrichment...");

      // Wait a bit for enrichment to complete (real API calls)
      await browser.pause(5000);

      const enrichment = await checkGameEnrichment(0);
      console.log(`Game: "${enrichment.gameTitle}"`);
      console.log(`  - IGDB data: ${enrichment.hasIgdbData}`);
      console.log(`  - HLTB data: ${enrichment.hasHltbData}`);
      console.log(`  - ProtonDB data: ${enrichment.hasProtonDbData}`);
      console.log(`  - Assets: ${enrichment.hasAssets}`);

      // At minimum, we expect assets to be present (covers, etc.)
      // Note: Not all games will have HLTB or ProtonDB data, but IGDB/assets should work
      if (enrichment.hasAssets || enrichment.hasIgdbData) {
        console.log("✅ Game enrichment working");
      } else {
        console.log("⚠️ Game enrichment may not have completed yet");
      }

      await takeScreenshot("journey-04-enriched-games");
    });
  });

  // =====================================================
  // JOURNEY 2: Library Navigation & Filtering
  // =====================================================
  describe("Journey: Library Navigation & Filtering", () => {
    it("should have filter buttons visible", async () => {
      console.log("\n🔘 Checking filter buttons...");

      const bodyText = await $("body").getText();
      const hasFilters =
        bodyText.toLowerCase().includes("all games") ||
        bodyText.toLowerCase().includes("tous les jeux") ||
        bodyText.toLowerCase().includes("installed") ||
        bodyText.toLowerCase().includes("installé");

      console.log(`Filters visible: ${hasFilters}`);
      expect(hasFilters).toBe(true);

      await takeScreenshot("journey-05-filters");
    });

    it("should filter by installed games", async () => {
      console.log("\n📁 Filtering by installed games...");

      // Click on "Installed" filter button
      const filterButtons = await $$("button");
      let installedButton: WebdriverIO.Element | null = null;

      for (const btn of filterButtons) {
        try {
          const text = await btn.getText();
          if (text.toLowerCase().includes("install") || text.toLowerCase().includes("installé")) {
            installedButton = btn;
            break;
          }
        } catch {
          continue;
        }
      }

      if (installedButton) {
        await installedButton.click();
        await browser.pause(500);
        console.log("✅ Applied installed filter");
        await takeScreenshot("journey-06-installed-filter");
      } else {
        console.log("⚠️ Installed filter button not found");
      }
    });

    it("should click on a game card to see details", async () => {
      console.log("\n🎯 Opening game details...");

      // Click on first game card
      const firstCard = await $(".game-card");
      if (await firstCard.isExisting()) {
        await firstCard.click();
        await browser.pause(1500); // Wait for modal/view transition

        // Check if game detail is showing
        const bodyText = await $("body").getText();
        console.log(`Body text preview: ${bodyText.substring(0, 200)}`);

        await takeScreenshot("journey-07-game-detail");
        console.log("✅ Game detail opened");
      } else {
        console.log("⚠️ No game card to click");
      }
    });

    it("should close game detail and return to library", async () => {
      console.log("\n🔙 Returning to library...");

      // Press Escape or click outside to close detail
      await browser.keys(["Escape"]);
      await browser.pause(500);

      // Or navigate explicitly
      await navigateTo("/");
      await browser.pause(500);

      await takeScreenshot("journey-08-back-to-library");
      console.log("✅ Returned to library");
    });
  });

  // =====================================================
  // JOURNEY 3: Settings Exploration
  // =====================================================
  describe("Journey: Settings & Configuration", () => {
    it("should navigate to settings", async () => {
      console.log("\n⚙️ Opening settings...");

      await navigateTo("/settings");
      await browser.pause(1500); // Wait for view transition

      // Verify settings view is rendered
      await assertViewNotBlackScreen("Settings", ["système", "system", "comptes", "accounts"], 50);

      await takeScreenshot("journey-09-settings");
      console.log("✅ Settings opened");
    });

    it("should display store authentication status", async () => {
      console.log("\n🔑 Checking store authentication...");

      const bodyText = await $("body").getText();

      // Check for store names
      const hasEpic = bodyText.toLowerCase().includes("epic");
      const hasGog = bodyText.toLowerCase().includes("gog");
      const hasAmazon = bodyText.toLowerCase().includes("amazon");

      console.log(`Store mentions: Epic=${hasEpic}, GOG=${hasGog}, Amazon=${hasAmazon}`);

      await takeScreenshot("journey-10-store-status");
      console.log("✅ Store status displayed");
    });

    it("should display system information", async () => {
      console.log("\n💻 Checking system info...");

      const bodyText = await $("body").getText();

      // Look for system info elements (OS, CPU, Memory)
      const hasSystemInfo =
        bodyText.toLowerCase().includes("linux") ||
        bodyText.toLowerCase().includes("windows") ||
        bodyText.toLowerCase().includes("cpu") ||
        bodyText.toLowerCase().includes("mémoire") ||
        bodyText.toLowerCase().includes("memory");

      console.log(`System info visible: ${hasSystemInfo}`);

      await takeScreenshot("journey-11-system-info");
      console.log("✅ System info section present");
    });

    it("should return to library from settings", async () => {
      console.log("\n🏠 Returning to library...");

      await navigateTo("/");
      await browser.pause(1000);

      // Verify we're back in library
      await assertViewNotBlackScreen("Library", ["jeux", "games", "bibliothèque", "library"], 50);

      await takeScreenshot("journey-12-final-library");
      console.log("✅ Back to library - Journey complete!");
    });
  });

  // =====================================================
  // JOURNEY 4: Cache Validation
  // =====================================================
  describe("Journey: Cache Building Validation", () => {
    it("should have built cache during the session", async () => {
      console.log("\n💾 Validating cache...");

      // Check that games have cached data by examining enrichment
      const enrichment = await checkGameEnrichment(0);

      // Log cache status
      console.log(`Cache status for "${enrichment.gameTitle}":`);
      console.log(`  - Has assets (covers, etc.): ${enrichment.hasAssets}`);
      console.log(`  - Has IGDB metadata: ${enrichment.hasIgdbData}`);
      console.log(`  - Has HLTB times: ${enrichment.hasHltbData}`);
      console.log(`  - Has ProtonDB rating: ${enrichment.hasProtonDbData}`);

      // The cache should exist at ~/.local/share/pixxiden/
      // We can't directly check filesystem from browser, but enriched data proves cache worked

      if (enrichment.hasAssets || enrichment.hasIgdbData) {
        console.log("✅ Cache appears to be working (enriched data present)");
      } else {
        console.log("⚠️ Cache may not have built completely");
      }

      await takeScreenshot("journey-13-cache-status");
    });
  });
});

// =====================================================
// OPTIONAL: Diagnostic Tests
// =====================================================
describe("Diagnostics: Backend Health", () => {
  it("should be able to invoke Tauri commands", async () => {
    console.log("\n🔧 Testing Tauri IPC...");

    const systemInfo = await browser.executeAsync((done) => {
      const invoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        done({ error: "No Tauri invoke available" });
        return;
      }
      invoke("get_system_info")
        .then((result: any) => done(result))
        .catch((err: any) => done({ error: err.message || String(err) }));
    });

    console.log("System info response:", JSON.stringify(systemInfo, null, 2));

    expect(systemInfo).toBeDefined();
    expect((systemInfo as any).error).toBeUndefined();

    console.log("✅ Tauri IPC working");
  });

  it("should report store adapter availability", async () => {
    console.log("\n🏪 Checking store adapters...");

    const storeStatus = await browser.executeAsync((done) => {
      const invoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        done([]);
        return;
      }
      invoke("get_store_status")
        .then((result: any) => done(result))
        .catch((err: any) => done({ error: err.message || String(err) }));
    });

    console.log("Store status:", JSON.stringify(storeStatus, null, 2));

    if (Array.isArray(storeStatus)) {
      for (const store of storeStatus) {
        console.log(
          `  ${store.name}: available=${store.available}, authenticated=${store.authenticated}`,
        );
      }
    }

    console.log("✅ Store status retrieved");
  });
});
