/**
 * Page Object Model — Navigation Helper
 *
 * Handles top-level navigation between main views:
 * Library, Downloads, Accounts (/accounts), System (/system).
 *
 * Navigation is done via programmatic history pushState (Vue Router compatible).
 * For SideNav-based navigation, use SettingsPage.navigateTo().
 *
 * Routes:
 *   /           → Library (LibraryContent.vue)
 *   /game/:id   → Game Detail (GameDetailContent.vue)
 *   /downloads  → Downloads (DownloadsView.vue)
 *   /accounts   → Accounts — stores + API keys (AccountsView.vue)
 *   /system     → System settings (SystemView.vue)
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

  /**
   * Navigate to a settings-related view.
   * Mapping from old section names to new routes:
   *   "accounts" | "store" | "api-keys" → /accounts
   *   "system"   | "advanced"           → /system
   */
  async goToSettings(
    section: "accounts" | "system" | "store" | "api-keys" | "advanced" = "accounts",
  ): Promise<void> {
    const routeMap: Record<string, string> = {
      accounts: "/accounts",
      store: "/accounts",
      "api-keys": "/accounts",
      system: "/system",
      advanced: "/system",
    };
    await this.navigateTo(routeMap[section] ?? "/accounts");
  }

  /** Navigate to the Accounts view (/accounts) */
  async goToAccounts(): Promise<void> {
    await this.navigateTo("/accounts");
  }

  /** Navigate to the System view (/system) */
  async goToSystem(): Promise<void> {
    await this.navigateTo("/system");
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
