/**
 * Scenario 03 — Navigation
 *
 * User journey: user navigates between all main sections of the app:
 * Library → Settings (all tabs) → Downloads → back to Library.
 *
 * Tests that each view renders correctly and the app doesn't crash.
 * Uses keyboard shortcuts and programmatic navigation (no nav bar in this app).
 */

import { waitForAppReady } from "../helpers/utils";
import { LibraryPage } from "../page-objects/LibraryPage";
import { SettingsPage } from "../page-objects/SettingsPage";
import { DownloadsPage } from "../page-objects/DownloadsPage";
import { NavigationHelper } from "../page-objects/NavigationHelper";

describe("Scenario 03: Navigation", () => {
  const library = new LibraryPage();
  const settings = new SettingsPage();
  const downloads = new DownloadsPage();
  const nav = new NavigationHelper();

  before(async () => {
    await waitForAppReady();
    await library.waitForReady();
    await library.waitForLoaded(45000);
  });

  describe("Library → Settings flow", () => {
    it("should open settings via keyboard shortcut S", async () => {
      await browser.keys(["s"]);
      await browser.pause(1000);
      await settings.waitForReady();
      expect(await settings.isDisplayed()).toBe(true);
      console.log("⚙️ Settings opened via 'S' key");
    });

    it("should display all settings navigation items", async () => {
      const hasAll = await settings.hasAllNavItems();
      expect(hasAll).toBe(true);
      console.log("📋 All settings nav items visible");
    });

    it("should navigate to System settings tab", async () => {
      await settings.navigateTo("system");
      const isActive = await settings.isNavActive("system");
      expect(isActive).toBe(true);
      console.log("⚙️ System settings tab active");
    });

    it("should navigate to Store settings tab", async () => {
      await settings.navigateTo("store");
      const isActive = await settings.isNavActive("store");
      expect(isActive).toBe(true);
      console.log("🏪 Store settings tab active");
    });

    it("should navigate to API Keys settings tab", async () => {
      await settings.navigateTo("api-keys");
      const isActive = await settings.isNavActive("api-keys");
      expect(isActive).toBe(true);
      console.log("🔑 API Keys settings tab active");
    });

    it("should navigate to Advanced settings tab", async () => {
      await settings.navigateTo("advanced");
      const isActive = await settings.isNavActive("advanced");
      expect(isActive).toBe(true);
      console.log("🔧 Advanced settings tab active");
    });

    it("should close settings and return to library via Escape", async () => {
      await settings.close();
      await library.waitForReady();
      console.log("🔙 Back to library from settings");
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
    it("should navigate to settings via direct route", async () => {
      await nav.goToSettings("store");
      await settings.waitForReady();
      expect(await settings.isDisplayed()).toBe(true);
      console.log("🛤️ Direct route to settings/store works");
    });

    it("should navigate back to library via direct route", async () => {
      await nav.goToLibrary();
      await library.waitForReady();
      console.log("🛤️ Direct route to library works");
    });
  });

  describe("App stability after navigation", () => {
    it("should keep the app responsive after rapid navigation", async () => {
      // Rapidly navigate between views
      await nav.goToSettings("system");
      await browser.pause(300);
      await nav.goToDownloads();
      await browser.pause(300);
      await nav.goToLibrary();
      await browser.pause(300);
      await nav.goToSettings("api-keys");
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
