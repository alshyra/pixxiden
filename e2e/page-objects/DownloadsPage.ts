/**
 * Page Object Model — Downloads page
 *
 * Handles the downloads/installation queue view.
 */

import { Selectors } from "../helpers/selectors";

export class DownloadsPage {
  /** Wait for the downloads page to be ready */
  async waitForReady(timeout = 10000): Promise<void> {
    const el = await $(Selectors.downloads.view);
    await el.waitForDisplayed({ timeout });
  }

  /** Check if the downloads view is currently displayed */
  async isDisplayed(): Promise<boolean> {
    try {
      const el = await $(Selectors.downloads.view);
      return el.isDisplayed();
    } catch {
      return false;
    }
  }

  /** Get the full text content of the downloads view */
  async getText(): Promise<string> {
    const el = await $(Selectors.downloads.view);
    return el.getText();
  }

  /** Check if the downloads queue is empty (no active downloads) */
  async isEmpty(): Promise<boolean> {
    const text = await this.getText();
    // French UI: "Aucun téléchargement" or English "No downloads"
    return text.includes("Aucun") || text.includes("No download") || text.includes("vide");
  }
}
