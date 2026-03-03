/**
 * Page Object Model — Game Detail Page
 *
 * Handles the game detail view (GameDetailContent.vue).
 * Responsible for: game info, actions (install/play), synopsis.
 *
 * Architecture note:
 * - Title / Developer meta → GameHeroSection.vue (hero-title, hero-meta)
 * - Synopsis / Description → GameOverviewTab.vue (game-synopsis, game-description)
 *   Only visible when the "Vue d'ensemble" (overview) tab is active (default).
 * - Action button → GameActions.vue (primary-action-button)
 *   data-game-state="installed"     → Play mode
 *   data-game-state="not-installed" → Install mode
 *
 * Gamepad-first:
 *   - Install / Play → A button (Enter) — primary action is always focused by default
 *   - Go Back       → B button (Escape)
 *   - Force Close   → JS click (no gamepad equivalent)
 */

import { Selectors } from "../helpers/selectors";
import { gamepad } from "../helpers/gamepad";

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

  /** Get the game title from the hero section (always visible when on detail page) */
  async getGameTitle(): Promise<string> {
    const el = await $(Selectors.hero.title);
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
          }, Selectors.hero.title);
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
          Selectors.hero.title,
        )) || "N/A";
    }
    return title;
  }

  /** Get developer meta text from hero section (developer · year · genres) */
  async getDeveloperText(): Promise<string> {
    const el = await $(Selectors.hero.meta);
    await el.waitForDisplayed({ timeout: 5000 });
    // Use browser.execute() for reliable text extraction in wry
    const text: string = await browser.execute(
      (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? "",
      Selectors.hero.meta,
    );
    return text || (await el.getText());
  }

  /** Get the game description text from the overview tab */
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

  /** Check if synopsis section (overview tab content) exists */
  async hasSynopsis(): Promise<boolean> {
    const el = await $(Selectors.gameDetail.synopsis);
    return el.isDisplayed().catch(() => false);
  }

  // ===== Actions =====

  /** Check if install button is visible (game not installed) */
  async hasInstallButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.installButton);
    return el.isDisplayed().catch(() => false);
  }

  /** Check if play button is visible (game installed) */
  async hasPlayButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.playButton);
    return el.isDisplayed().catch(() => false);
  }

  /** Check if force close button is visible */
  async hasForceCloseButton(): Promise<boolean> {
    const el = await $(Selectors.gameActions.forceCloseButton);
    return el.isDisplayed().catch(() => false);
  }

  /**
   * Trigger the Install action.
   * Gamepad equivalent: A button (Enter) — the install action button is focused by default.
   */
  async clickInstall(): Promise<void> {
    const el = await $(Selectors.gameActions.installButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await gamepad.confirm();
  }

  /**
   * Trigger the Play action.
   * Gamepad equivalent: A button (Enter) — the play action button is focused by default.
   */
  async clickPlay(): Promise<void> {
    const el = await $(Selectors.gameActions.playButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await gamepad.confirm();
  }

  /** Click force close button */
  async clickForceClose(): Promise<void> {
    const el = await $(Selectors.gameActions.forceCloseButton);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
  }

  /** Go back to library — B button (Escape) */
  async goBack(): Promise<void> {
    await gamepad.back(500);
  }
}
