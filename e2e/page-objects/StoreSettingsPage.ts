/**
 * Page Object Model — Store Settings (Comptes tab)
 *
 * Handles the store connection cards in Settings > Comptes.
 * Responsible for: connect/disconnect buttons, auth status.
 */

import { Selectors } from "../helpers/selectors";

type StoreName = "epic" | "gog" | "amazon" | "steam";

export class StoreSettingsPage {
  /** Check if a store card is displayed */
  async hasStoreCard(store: StoreName): Promise<boolean> {
    const selectorMap: Record<StoreName, string> = {
      epic: Selectors.storeSettings.epicCard,
      gog: Selectors.storeSettings.gogCard,
      amazon: Selectors.storeSettings.amazonCard,
      steam: Selectors.storeSettings.steamCard,
    };
    try {
      const el = await $(selectorMap[store]);
      return el.isDisplayed();
    } catch {
      return false;
    }
  }

  /** Check if a store shows "Connecté" status */
  async isStoreConnected(store: StoreName): Promise<boolean> {
    const selectorMap: Record<StoreName, string> = {
      epic: Selectors.storeSettings.epicCard,
      gog: Selectors.storeSettings.gogCard,
      amazon: Selectors.storeSettings.amazonCard,
      steam: Selectors.storeSettings.steamCard,
    };
    try {
      const card = await $(selectorMap[store]);
      const text = await card.getText();
      return text.includes("Connecté") || text.includes("Détecté");
    } catch {
      return false;
    }
  }

  /** Click the connect button for a store */
  async clickConnect(store: Exclude<StoreName, "steam">): Promise<void> {
    const selectorMap: Record<string, string> = {
      epic: Selectors.storeSettings.epicConnect,
      gog: Selectors.storeSettings.gogConnect,
      amazon: Selectors.storeSettings.amazonConnect,
    };
    const el = await $(selectorMap[store]);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
    await browser.pause(1000);
  }

  /** Click the disconnect button for a store */
  async clickDisconnect(store: Exclude<StoreName, "steam">): Promise<void> {
    const selectorMap: Record<string, string> = {
      epic: Selectors.storeSettings.epicDisconnect,
      gog: Selectors.storeSettings.gogDisconnect,
      amazon: Selectors.storeSettings.amazonDisconnect,
    };
    const el = await $(selectorMap[store]);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
    await browser.pause(1000);
  }

  /** Get all visible store cards count */
  async getStoreCardCount(): Promise<number> {
    const stores: StoreName[] = ["epic", "gog", "amazon", "steam"];
    let count = 0;
    for (const store of stores) {
      if (await this.hasStoreCard(store)) count++;
    }
    return count;
  }
}
