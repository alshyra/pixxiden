/**
 * Page Object Model — Library Page
 *
 * Handles the main game library view (LibraryFullscreen.vue).
 * Responsible for: game carousel, hero banner, filters, game selection.
 */

import { Selectors } from "../helpers/selectors";

export class LibraryPage {
  /** Wait for the library view to be displayed */
  async waitForReady(timeout = 15000): Promise<void> {
    const view = await $(Selectors.library.view);
    await view.waitForDisplayed({ timeout });
  }

  /** Check if loading spinner is visible */
  async isLoading(): Promise<boolean> {
    const el = await $(Selectors.library.loading);
    return el.isDisplayed().catch(() => false);
  }

  /** Wait for loading to finish */
  async waitForLoaded(timeout = 30000): Promise<void> {
    await browser.waitUntil(
      async () => {
        const loading = await this.isLoading();
        return !loading;
      },
      { timeout, timeoutMsg: "Library still loading after timeout" },
    );
  }

  /** Check if library shows the empty state */
  async hasEmptyState(): Promise<boolean> {
    const el = await $(Selectors.library.empty);
    return el.isDisplayed().catch(() => false);
  }

  /** Check if game carousel is visible (= games are loaded) */
  async hasGames(): Promise<boolean> {
    const el = await $(Selectors.library.carousel);
    return el.isDisplayed().catch(() => false);
  }

  /** Get the game count text (e.g. "42 jeux") */
  async getGameCountText(): Promise<string | null> {
    try {
      const el = await $(Selectors.library.gameCount);
      const displayed = await el.isDisplayed();
      return displayed ? el.getText() : null;
    } catch {
      return null;
    }
  }

  /** Get all game card elements */
  async getGameCards(): Promise<WebdriverIO.ElementArray> {
    return $$(Selectors.gameCard.card);
  }

  /** Get the number of visible game cards */
  async getGameCardCount(): Promise<number> {
    const cards = await this.getGameCards();
    return cards.length;
  }

  /** Click on a game card by its data-id attribute */
  async selectGameById(gameId: string): Promise<void> {
    const card = await $(`[data-id="${gameId}"]`);
    await card.waitForDisplayed({ timeout: 5000 });
    await card.click();
  }

  /** Click on the first game card */
  async selectFirstGame(): Promise<void> {
    const cards = await this.getGameCards();
    if (cards.length === 0) throw new Error("No game cards found");
    await cards[0].click();
  }

  /** Double-click on a game card to open details */
  async openGameDetails(gameId: string): Promise<void> {
    const card = await $(`[data-id="${gameId}"]`);
    await card.waitForDisplayed({ timeout: 5000 });
    await card.doubleClick();
  }

  /** Open details for first game card */
  async openFirstGameDetails(): Promise<void> {
    const cards = await this.getGameCards();
    if (cards.length === 0) throw new Error("No game cards found");
    await cards[0].doubleClick();
  }

  /** Get the hero banner title text */
  async getHeroTitle(): Promise<string> {
    const el = await $(Selectors.hero.title);
    await el.waitForDisplayed({ timeout: 5000 });
    return el.getText();
  }

  /** Check if hero banner is visible */
  async hasHeroBanner(): Promise<boolean> {
    const el = await $(Selectors.hero.banner);
    return el.isDisplayed().catch(() => false);
  }

  // ===== Filters =====

  /** Click a store filter */
  async clickFilter(
    filter: "all" | "installed" | "epic" | "gog" | "amazon" | "steam",
  ): Promise<void> {
    const selectorMap: Record<string, string> = {
      all: Selectors.filters.all,
      installed: Selectors.filters.installed,
      epic: Selectors.filters.epic,
      gog: Selectors.filters.gog,
      amazon: Selectors.filters.amazon,
      steam: Selectors.filters.steam,
    };
    const el = await $(selectorMap[filter]);
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
    await browser.pause(500); // Wait for filter animation
  }

  /** Check if filters bar is visible */
  async hasFilters(): Promise<boolean> {
    const el = await $(Selectors.filters.nav);
    return el.isDisplayed().catch(() => false);
  }
}
