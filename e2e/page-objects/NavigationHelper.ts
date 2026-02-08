/**
 * Page Object Model — Navigation Helper
 *
 * Handles top-level navigation between main views:
 * Library, Downloads, Settings.
 * Also handles the splashscreen → main app transition.
 */

import { waitForAppReady } from "../helpers/utils";

export class NavigationHelper {
  /** Wait for the app to finish the splashscreen and reach the main window */
  async waitForAppReady(): Promise<void> {
    await waitForAppReady();
  }

  /** Navigate to a route via Vue Router (programmatic) */
  async navigateTo(path: string): Promise<void> {
    // Use Vue Router's push internally to avoid full page reload
    await browser.execute((p: string) => {
      // Access the Vue app's router via the global __VUE_DEVTOOLS_GLOBAL_HOOK__
      // or by navigating to the URL directly
      window.history.pushState({}, "", p);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
    await browser.pause(800);
  }

  /** Navigate to the Library (home) page */
  async goToLibrary(): Promise<void> {
    await this.navigateTo("/");
  }

  /** Navigate to a game detail page by ID */
  async goToGameDetail(gameId: string): Promise<void> {
    await this.navigateTo(`/game/${gameId}`);
  }

  /** Navigate to the Downloads page */
  async goToDownloads(): Promise<void> {
    await this.navigateTo("/downloads");
  }

  /** Navigate to Settings */
  async goToSettings(
    section: "system" | "store" | "api-keys" | "advanced" = "system",
  ): Promise<void> {
    await this.navigateTo(`/settings/${section}`);
  }

  /** Get the current route path */
  async getCurrentRoute(): Promise<string> {
    const url = await browser.getUrl();
    // URL is like tauri://localhost/ or tauri://localhost/game/123
    try {
      const parsed = new URL(url);
      return parsed.pathname || "/";
    } catch {
      // Fallback: extract path after hostname
      const match = url.match(/localhost(\/[^?#]*)/);
      return match ? match[1] : "/";
    }
  }

  /** Check if we're on a specific route */
  async isOnRoute(expectedPath: string): Promise<boolean> {
    const route = await this.getCurrentRoute();
    return route === expectedPath || route.startsWith(expectedPath);
  }

  /** Go back (browser back button) */
  async goBack(): Promise<void> {
    await browser.back();
    await browser.pause(500);
  }
}
