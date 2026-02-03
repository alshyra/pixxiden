/**
 * Page Object Model for Settings Page
 * Handles all interactions with the settings UI (System, Comptes, Clés API, Avancé)
 */

export class SettingsPage {
  /**
   * Navigate to a specific settings tab
   */
  async navigateToTab(tabName: "Système" | "Comptes" | "Clés API" | "Avancé") {
    const tab = await $(`.//a[contains(., "${tabName}") and not(.//a)]`);
    await tab.waitForExist({ timeout: 5000 });
    await browser.execute((el) => el.click(), tab);
    await browser.pause(1000);
  }

  /**
   * Navigate to Store settings (Comptes tab)
   */
  async navigateToStoreSettings() {
    await this.navigateToTab("Comptes");
    const url = await browser.getUrl();
    expect(url).toContain("settings/store");
  }

  /**
   * Check if on settings page
   */
  async isOnSettings(): Promise<boolean> {
    const url = await browser.getUrl();
    return url.includes("settings");
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await browser.getUrl();
  }

  /**
   * Take a screenshot with a given name
   */
  async takeScreenshot(name: string) {
    await browser.takeScreenshot();
    const screenshotPath = `e2e/screenshots/${name}.png`;
    await browser.saveScreenshot(screenshotPath);
  }
}
