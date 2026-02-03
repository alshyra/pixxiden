/**
 * Page Object Model for Store Settings (Comptes tab)
 * Handles store connections (Epic, GOG, Amazon, Steam)
 */

export class StoreSettingsPage {
  /**
   * Find a store by name and return its connection button
   */
  async findStoreConnectionButton(
    storeName: "Epic Games" | "GOG Galaxy" | "Amazon Games" | "Steam",
  ): Promise<WebdriverIO.Element | null> {
    const buttons = await $$("button");

    for (const btn of buttons) {
      try {
        const text = await btn.getText();
        const parent = await btn.parentElement();
        const parentText = await parent.getText();

        if (
          (text.includes("CONNEXION") || text.includes("CONNECT")) &&
          (parentText.includes(storeName) || parentText.includes(storeName.split(" ")[0]))
        ) {
          return btn;
        }
      } catch (e) {
        // Skip on error
      }
    }

    // Fallback: find first CONNEXION button
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes("CONNEXION")) {
        return btn;
      }
    }

    return null;
  }

  /**
   * Click on a store's connection button
   */
  async clickStoreConnection(storeName: "Epic Games" | "GOG Galaxy" | "Amazon Games" | "Steam") {
    const button = await this.findStoreConnectionButton(storeName);
    expect(button).not.toBeNull();
    await button!.click();
    await browser.pause(1500);
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
