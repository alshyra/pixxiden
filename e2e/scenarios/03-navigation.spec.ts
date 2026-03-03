/**
 * Scenario 03 — Navigation
 *
 * User journey: user navigates between all main sections of the app:
 * Library → SideNav → Accounts → Library → SideNav → System → Library → Downloads.
 *
 * Navigation architecture (as of current codebase):
 * - "S" key opens the SideNav overlay (NOT a route)
 * - SideNav items navigate to: / | /downloads | /accounts | /system
 * - No /settings/* routes exist: settings are split across /accounts and /system
 * - Escape closes the SideNav overlay without navigating
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";
import { SettingsPage } from "../page-objects/SettingsPage";
import { DownloadsPage } from "../page-objects/DownloadsPage";
import { NavigationHelper } from "../page-objects/NavigationHelper";

describe("Scenario 03: Navigation", () => {
  const library = new LibraryPage();
  const sideNav = new SettingsPage(); // SettingsPage now represents SideNav + views
  const downloads = new DownloadsPage();
  const nav = new NavigationHelper();

  before(async () => {
    await waitForAppReady();
    await library.waitForReady();
    await library.waitForLoaded(45000);
  });

  describe("Library → SideNav flow", () => {
    it("should open the SideNav via keyboard shortcut S", async () => {
      await sideNav.openViaSKey();
      await sideNav.waitForReady();
      expect(await sideNav.isDisplayed()).toBe(true);
      console.log("☰ SideNav opened via 'S' key");
    });

    it("should display all main navigation items in the SideNav", async () => {
      const hasAll = await sideNav.hasAllNavItems();
      expect(hasAll).toBe(true);
      console.log("📋 All SideNav items visible (Library, Downloads, Accounts, System)");
    });

    it("should close SideNav when pressing Escape and return to library", async () => {
      await sideNav.close();
      await library.waitForReady();
      expect(await library.isLoading()).toBe(false);
      console.log("🔙 SideNav closed via Escape");
    });
  });

  describe("Library → Accounts flow", () => {
    it("should open SideNav and navigate to Accounts view", async () => {
      await sideNav.openViaSKey();
      await sideNav.waitForReady();
      await sideNav.navigateTo("accounts");
      await sideNav.waitForAccountsReady();
      expect(await sideNav.isAccountsDisplayed()).toBe(true);
      console.log("👤 Accounts view displayed");
    });

    it("should return to library from Accounts via SideNav", async () => {
      await sideNav.openViaSKey();
      await sideNav.waitForReady();
      await sideNav.navigateTo("library");
      await library.waitForReady();
      expect(await library.hasFilters()).toBe(true);
      console.log("🔙 Back to library from Accounts");
    });
  });

  describe("Library → System flow", () => {
    it("should open SideNav and navigate to System view", async () => {
      await sideNav.openViaSKey();
      await sideNav.waitForReady();
      await sideNav.navigateTo("system");
      await sideNav.waitForSystemReady();
      expect(await sideNav.isSystemDisplayed()).toBe(true);
      console.log("⚙️ System view displayed");
    });

    it("should return to library from System via SideNav", async () => {
      await sideNav.openViaSKey();
      await sideNav.waitForReady();
      await sideNav.navigateTo("library");
      await library.waitForReady();
      expect(await library.hasFilters()).toBe(true);
      console.log("🔙 Back to library from System");
    });
  });

  describe("Library → Downloads flow", () => {
    it("should navigate to downloads page", async () => {
      await nav.goToDownloads();
      await downloads.waitForReady();
      expect(await downloads.isDisplayed()).toBe(true);
      console.log("📥 Downloads page displayed");
    });

    it("should show the downloads view content", async () => {
      const text = await downloads.getText();
      expect(text.length).toBeGreaterThan(0);
      console.log(
        (await downloads.isEmpty()) ? "📭 No active downloads" : "📥 Downloads are active",
      );
    });

    it("should navigate back to library", async () => {
      await nav.goToLibrary();
      await library.waitForReady();
      expect(await library.hasFilters()).toBe(true);
      console.log("🔙 Back to library from downloads");
    });
  });

  describe("Programmatic route navigation", () => {
    it("should navigate to accounts via direct route", async () => {
      await nav.goToAccounts();
      await sideNav.waitForAccountsReady();
      expect(await sideNav.isAccountsDisplayed()).toBe(true);
      console.log("🛤️ Direct route /accounts works");
    });

    it("should navigate to system via direct route", async () => {
      await nav.goToSystem();
      await sideNav.waitForSystemReady();
      expect(await sideNav.isSystemDisplayed()).toBe(true);
      console.log("🛤️ Direct route /system works");
    });

    it("should navigate back to library via direct route", async () => {
      await nav.goToLibrary();
      await library.waitForReady();
      console.log("🛤️ Direct route / (library) works");
    });
  });

  describe("App stability after navigation", () => {
    it("should keep the app responsive after rapid navigation", async () => {
      // Rapidly navigate between views
      await nav.goToAccounts();
      await browser.pause(300);
      await nav.goToDownloads();
      await browser.pause(300);
      await nav.goToLibrary();
      await browser.pause(300);
      await nav.goToSystem();
      await browser.pause(300);
      await nav.goToLibrary();

      // App should still be responsive
      await library.waitForReady();
      const bodyText = await $("body").getText();
      expect(bodyText.length).toBeGreaterThan(0);
      console.log("✅ App stable after rapid navigation");
    });
  });
});
