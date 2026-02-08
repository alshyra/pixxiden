/**
 * Page Object Model — Settings Page
 *
 * Handles the settings overlay (SettingsView.vue).
 * Responsible for: sidebar navigation, settings sections.
 */

import { Selectors } from "../helpers/selectors";

export class SettingsPage {
  /** Wait for settings overlay to be displayed */
  async waitForReady(timeout = 10000): Promise<void> {
    const view = await $(Selectors.settings.view);
    await view.waitForDisplayed({ timeout });
  }

  /** Check if settings is open */
  async isDisplayed(): Promise<boolean> {
    const el = await $(Selectors.settings.view);
    return el.isDisplayed().catch(() => false);
  }

  /** Navigate to a settings section via sidebar */
  async navigateTo(section: "system" | "store" | "api-keys" | "advanced"): Promise<void> {
    const selectorMap: Record<string, string> = {
      system: Selectors.settings.navSystem,
      store: Selectors.settings.navStore,
      "api-keys": Selectors.settings.navApiKeys,
      advanced: Selectors.settings.navAdvanced,
    };
    const navItem = await $(selectorMap[section]);
    await navItem.waitForDisplayed({ timeout: 5000 });
    await navItem.click();
    await browser.pause(500);
  }

  /** Check if a specific nav item is active (has "active" class) */
  async isNavActive(section: "system" | "store" | "api-keys" | "advanced"): Promise<boolean> {
    const selectorMap: Record<string, string> = {
      system: Selectors.settings.navSystem,
      store: Selectors.settings.navStore,
      "api-keys": Selectors.settings.navApiKeys,
      advanced: Selectors.settings.navAdvanced,
    };
    try {
      const el = await $(selectorMap[section]);
      const classes = await el.getAttribute("class");
      return classes?.includes("active") ?? false;
    } catch {
      return false;
    }
  }

  /** Close settings by pressing Escape */
  async close(): Promise<void> {
    await browser.keys(["Escape"]);
    await browser.pause(500);
  }

  /** Check that all 4 nav items exist in the sidebar */
  async hasAllNavItems(): Promise<boolean> {
    const items = [
      Selectors.settings.navSystem,
      Selectors.settings.navStore,
      Selectors.settings.navApiKeys,
      Selectors.settings.navAdvanced,
    ];
    for (const selector of items) {
      const el = await $(selector);
      if (!(await el.isExisting())) return false;
    }
    return true;
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
