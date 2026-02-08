/**
 * Page Object Model — Game Detail Page
 *
 * Handles the game detail view (GameDetails.vue).
 * Responsible for: game info, actions (install/play), synopsis.
 */

import { Selectors } from "../helpers/selectors";

export class GameDetailPage {
  /** Wait for game detail view to be displayed */
  async waitForReady(timeout = 10000): Promise<void> {
    const view = await $(Selectors.gameDetail.view);
    await view.waitForDisplayed({ timeout });
  }

  /** Check if we're on the game detail page */
  async isDisplayed(): Promise<boolean> {
    const el = await $(Selectors.gameDetail.view);
    return el.isDisplayed().catch(() => false);
  }

  /** Get the game title from the info card (waits for non-empty text) */
  async getGameTitle(): Promise<string> {
    const el = await $(Selectors.gameInfo.title);
    await el.waitForDisplayed({ timeout: 5000 });

    // wry WebDriver getText() often returns empty for Vue-reactive content.
    // Use browser.execute() to read textContent directly from the DOM.
    let title = "";
    try {
      await browser.waitUntil(
        async () => {
          const text: string = await browser.execute((selector: string) => {
            const node = document.querySelector(selector);
            return node?.textContent?.trim() ?? "";
          }, Selectors.gameInfo.title);
          if (text.length > 0 && text !== "N/A") {
            title = text;
            return true;
          }
          return false;
        },
        { timeout: 5000, timeoutMsg: "Game title not populated", interval: 300 },
      );
    } catch {
      // Fallback: return whatever we can get
      title =
        (await browser.execute(
          (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? "",
          Selectors.gameInfo.title,
        )) || "N/A";
    }
    return title;
  }

  /** Get developer + year text */
  async getDeveloperText(): Promise<string> {
    const el = await $(Selectors.gameInfo.developer);
    await el.waitForDisplayed({ timeout: 5000 });
    // Use browser.execute() for reliable text extraction in wry
    const text: string = await browser.execute(
      (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? "",
      Selectors.gameInfo.developer,
    );
    return text || (await el.getText());
  }

  /** Get the game description text from synopsis */
  async getDescription(): Promise<string> {
    const el = await $(Selectors.gameDetail.description);
    await el.waitForDisplayed({ timeout: 5000 });
    // Use browser.execute() for reliable text extraction in wry
    const text: string = await browser.execute(
      (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? "",
      Selectors.gameDetail.description,
    );
    return text || (await el.getText());
  }

  /** Check if synopsis section exists */
  async hasSynopsis(): Promise<boolean> {
    const el = await $(Selectors.gameDetail.synopsis);
    return el.isDisplayed().catch(() => false);
  }

  // ===== Actions =====

  /** Check if install button is visible */
  async hasInstallButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.installButton);
    return el.isDisplayed().catch(() => false);
  }

  /** Check if play button is visible */
  async hasPlayButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.playButton);
    return el.isDisplayed().catch(() => false);
  }

  /** Check if force close button is visible */
  async hasForceCloseButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.forceCloseButton);
    return el.isDisplayed().catch(() => false);
  }

  /** Click install button */
  async clickInstall(): Promise<void> {
    const el = await $(Selectors.gameActions.installButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
  }

  /** Click play button */
  async clickPlay(): Promise<void> {
    const el = await $(Selectors.gameActions.playButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
  }

  /** Click force close button */
  async clickForceClose(): Promise<void> {
    const el = await $(Selectors.gameActions.forceCloseButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
  }

  /** Go back to library (press Escape or browser back) */
  async goBack(): Promise<void> {
    await browser.keys(["Escape"]);
    await browser.pause(500);
  }
}
