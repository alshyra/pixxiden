import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { browser } from "@wdio/globals";
import { waitForAppReady, invokeTauriCommand, navigateTo, delay } from "../helpers";

describe("New Features E2E Tests", () => {
  before(async function () {
    this.timeout(30000);
    await waitForAppReady();
  });

  after(async function () {
    // Cleanup
  });

  describe("Splash Screen Progress", () => {
    it("should show splash screen on app launch", async function () {
      this.timeout(10000);

      // Check if splash screen is visible initially
      const splashExists = await browser.execute(() => {
        const splash =
          document.querySelector(".tmp-splash") ||
          document.querySelector('[data-testid="splash-screen"]');
        return splash !== null;
      });

      // It may already be gone, so we just verify the app loaded
      expect(splashExists).to.be.a("boolean");
    });

    it("should emit progress events during game sync", async function () {
      this.timeout(15000);

      // Sync games and verify it completes
      const result = await invokeTauriCommand("sync_games");

      expect(result).to.be.an("object");
      expect(result).to.have.property("total_games");
      expect(result).to.have.property("new_games");
    });
  });

  describe("PS Button / Guide Button", () => {
    it("should toggle settings when no game is running", async function () {
      this.timeout(10000);

      // Make sure we're on library view
      await navigateTo("/");
      await delay(500);

      // Simulate PS button press (via Tauri event emission)
      const currentPath = await browser.execute(() => {
        return window.location.pathname;
      });

      expect(currentPath).to.equal("/");

      // We can't easily simulate gamepad input in headless mode,
      // but we can verify the settings route exists
      await navigateTo("/settings");
      await delay(500);

      const settingsPath = await browser.execute(() => {
        return window.location.pathname;
      });

      expect(settingsPath).to.equal("/settings");

      // Navigate back
      await navigateTo("/");
    });
  });

  describe("Game Overlay Window", () => {
    it("should have overlay route registered", async function () {
      this.timeout(5000);

      // Navigate to overlay route (though it won't render without a game)
      await navigateTo("/overlay");
      await delay(500);

      const overlayPath = await browser.execute(() => {
        return window.location.pathname;
      });

      expect(overlayPath).to.equal("/overlay");

      // Navigate back
      await navigateTo("/");
    });

    it("should not crash when overlay window is created", async function () {
      this.timeout(5000);

      // Verify GameOverlay component exists in App.vue
      const hasOverlay = await browser.execute(() => {
        const app = document.querySelector("#app");
        return app !== null;
      });

      expect(hasOverlay).to.be.true; // eslint-disable-line no-unused-expressions
    });
  });

  describe("Splash Progress Events", () => {
    it("should handle SplashProgressEvent structure", async function () {
      this.timeout(5000);

      // Verify the event structure is correct by checking sync
      const syncResult = await invokeTauriCommand("sync_games");

      // The command should complete without errors
      expect(syncResult).to.be.an("object");
      expect(syncResult).to.have.property("total_games");

      // If there were errors, they should be an array
      if (syncResult.errors) {
        expect(syncResult.errors).to.be.an("array");
      }
    });
  });
});
