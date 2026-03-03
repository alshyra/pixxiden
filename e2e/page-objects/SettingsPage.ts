/**
 * Page Object Model — Settings / SideNav
 *
 * Handles the SideNav overlay (SideNav.vue) and the settings-related views:
 * - AccountsView.vue (/accounts) — store connections + API keys
 * - SystemView.vue  (/system)   — system settings + advanced
 *
 * The SideNav opens via "S" key or the gamepad Options button.
 * It is NOT a route: it's an overlay rendered on top of any view.
 */

import { Selectors } from "../helpers/selectors";
import { gamepad } from "../helpers/gamepad";

export class SettingsPage {
  // ===== Side Nav =====

  /** Open the SideNav via the "S" keyboard shortcut */
  async openViaSKey(): Promise<void> {
    await browser.keys(["s"]);
    await browser.pause(600);
  }

  /** Wait for the SideNav overlay to be displayed */
  async waitForReady(timeout = 10000): Promise<void> {
    const nav = await $(Selectors.sideNav.nav);
    await nav.waitForDisplayed({ timeout });
  }

  /** Check if the SideNav overlay is currently displayed */
  async isDisplayed(): Promise<boolean> {
    const el = await $(Selectors.sideNav.nav);
    return el.isDisplayed().catch(() => false);
  }

  /** Close the SideNav by pressing Escape */
  async close(): Promise<void> {
    await browser.keys(["Escape"]);
    await browser.pause(500);
  }

  /** Check that all main navigation items exist in the SideNav */
  async hasAllNavItems(): Promise<boolean> {
    const items = [
      Selectors.sideNav.library,
      Selectors.sideNav.downloads,
      Selectors.sideNav.accounts,
      Selectors.sideNav.system,
    ];
    for (const selector of items) {
      const el = await $(selector);
      if (!(await el.isExisting())) return false;
    }
    return true;
  }

  /**
   * Navigate to a section via the SideNav.
   * The SideNav must already be open.
   *
   * Uses direct DOM click on the nav item rather than gamepad ArrowDown/Up + Enter,
   * because the 'confirm' (Enter) event fires globally and can conflict with background
   * handlers (e.g. library game-card selection) when the SideNav overlay is open.
   * The S key (menu open) and Escape (close) remain gamepad-simulated.
   */
  async navigateTo(section: "library" | "downloads" | "accounts" | "system"): Promise<void> {
    const selectorMap: Record<string, string> = {
      library: Selectors.sideNav.library,
      downloads: Selectors.sideNav.downloads,
      accounts: Selectors.sideNav.accounts,
      system: Selectors.sideNav.system,
    };
    const navItem = await $(selectorMap[section]);
    await navItem.waitForDisplayed({ timeout: 5000 });
    await browser.execute((el: any) => el.click(), navItem);
    await browser.pause(500);
  }

  /** Check if a SideNav item is the active (highlighted) item */
  async isNavActive(section: "library" | "downloads" | "accounts" | "system"): Promise<boolean> {
    const selectorMap: Record<string, string> = {
      library: Selectors.sideNav.library,
      downloads: Selectors.sideNav.downloads,
      accounts: Selectors.sideNav.accounts,
      system: Selectors.sideNav.system,
    };
    try {
      const el = await $(selectorMap[section]);
      // The active item has bg-[#5e5ce6] class applied by Vue's :class binding
      const classes = await el.getAttribute("class");
      return classes?.includes("bg-\\[\\#5e5ce6\\]") ?? false;
    } catch {
      return false;
    }
  }

  // ===== Accounts View (/accounts) =====

  /** Wait for the Accounts view to be displayed */
  async waitForAccountsReady(timeout = 10000): Promise<void> {
    const el = await $(Selectors.accounts.view);
    await el.waitForDisplayed({ timeout });
  }

  /** Check if the Accounts view is displayed */
  async isAccountsDisplayed(): Promise<boolean> {
    const el = await $(Selectors.accounts.view);
    return el.isDisplayed().catch(() => false);
  }

  // ===== System View (/system) =====

  /** Wait for the System view to be displayed */
  async waitForSystemReady(timeout = 10000): Promise<void> {
    const el = await $(Selectors.system.view);
    await el.waitForDisplayed({ timeout });
  }

  /** Check if the System view is displayed */
  async isSystemDisplayed(): Promise<boolean> {
    const el = await $(Selectors.system.view);
    return el.isDisplayed().catch(() => false);
  }

  /** Take a screenshot */
  async takeScreenshot(name: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      await browser.saveScreenshot(`./e2e/screenshots/${name}-${timestamp}.png`);
    } catch (e) {
      console.log(`[SettingsPage] Screenshot failed: ${(e as Error).message}`);
    }
  }
}
