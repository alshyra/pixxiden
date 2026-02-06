/**
 * Page Object Model for Store Settings (Comptes tab)
 * Handles store connections (Epic, GOG, Amazon, Steam)
 */

export class StoreSettingsPage {
  /**
   * Find a store connection button by data-testid
   */
  async findStoreConnectionButton(
    storeName: "epic" | "gog" | "amazon" | "steam",
  ): Promise<WebdriverIO.Element | null> {
    const selector = `[data-testid="${storeName}-connect-button"]`;
    try {
      const button = await $(selector);
      const isDisplayed = await button.isDisplayed();
      if (isDisplayed) {
        return button;
      }
    } catch (error) {
      console.log(`  [DEBUG] Button ${selector} not found or not displayed`);
    }
    return null;
  }

  /**
   * Click on a store's connection button
   */
  async clickStoreConnection(storeName: "epic" | "gog" | "amazon" | "steam") {
    const button = await this.findStoreConnectionButton(storeName);
    expect(button).not.toBeNull();
    if (button) {
      await button.click();
      await browser.pause(1500);
    }
  }

  /**
   * Check if a store is shown in the settings
   */
  async hasStore(storeName: string): Promise<boolean> {
    const bodyText = await $("body").getText();
    return bodyText.includes(storeName);
  }

  /**
   * Check if a store shows as connected
   */
  async isStoreConnected(storeName: string): Promise<boolean> {
    const bodyText = await $("body").getText();
    return bodyText.includes("DÉCONNEXION") || bodyText.includes("CONNECTÉ");
  }

  /**
   * Check if a store shows as disconnected
   */
  async isStoreDisconnected(storeName: string): Promise<boolean> {
    const bodyText = await $("body").getText();
    return bodyText.includes("NON DÉTECTÉ") || bodyText.includes("CONNEXION");
  }
}
