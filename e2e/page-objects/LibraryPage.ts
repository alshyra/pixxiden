/**
 * Page Object Model — Library Page
 *
 * Handles the main game library view (LibraryFullscreen.vue).
 * Responsible for: game carousel, hero banner, filters, game selection.
 *
 * Gamepad-first: navigation uses keyboard shortcuts that mirror gamepad buttons
 * as defined in src/composables/useGamepad.ts.
 *   - Confirm / A    → Enter
 *   - Back    / B    → Escape
 *   - RB      / R1   → E  (cycle filter forward)
 *   - LB      / L1   → Q  (cycle filter backward)
 *   - D-pad          → Arrow keys
 */

import { Selectors } from "../helpers/selectors";
import { gamepad } from "../helpers/gamepad";

/** Filter order as defined in LibraryContent.vue */
const FILTER_ORDER = ["all", "installed", "epic", "gog", "amazon", "steam"] as const;
type FilterName = (typeof FILTER_ORDER)[number];

export class LibraryPage {
  /** Tracks the current active filter index — kept in sync by navigateToFilter() */
  private currentFilterIndex = 0;
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

  /**
   * Select (focus) the first game card and open its detail page.
   * Gamepad equivalent: A button (Enter) — the first card is focused by default.
   */
  async selectFirstGame(): Promise<void> {
    const cards = await this.getGameCards();
    if (cards.length === 0) throw new Error("No game cards found");
    await gamepad.confirm();
  }

  /** Open details for first game card (same as selectFirstGame — confirm opens detail). */
  async openFirstGameDetails(): Promise<void> {
    const cards = await this.getGameCards();
    if (cards.length === 0) throw new Error("No game cards found");
    await gamepad.confirm();
  }

  /**
   * Open detail for a specific game by data-id.
   * Uses JS click since navigating to an arbitrary card by keyboard is impractical.
   */
  async openGameDetails(gameId: string): Promise<void> {
    const card = await $(`[data-id="${gameId}"]`);
    await card.waitForDisplayed({ timeout: 5000 });
    await browser.execute((el: any) => el.click(), card);
    await browser.pause(300);
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

  /**
   * Navigate to a store filter using gamepad LB/RB cycling (Q / E keys).
   *
   * Filter order (matches LibraryContent.vue filterOrder):
   *   0=all  1=installed  2=epic  3=gog  4=amazon  5=steam
   *
   * RB (E) cycles forward, LB (Q) cycles backward.
   * State is tracked per LibraryPage instance; reset with resetFilter().
   */
  async clickFilter(filter: FilterName): Promise<void> {
    const targetIndex = FILTER_ORDER.indexOf(filter);
    if (targetIndex === -1) throw new Error(`Unknown filter: ${filter}`);

    const total = FILTER_ORDER.length;
    let delta = (targetIndex - this.currentFilterIndex + total) % total;

    // Choose shortest path: forward (RB) or backward (LB)
    if (delta > total / 2) {
      // Shorter to go backward
      const backSteps = total - delta;
      for (let i = 0; i < backSteps; i++) {
        await gamepad.lb();
      }
    } else {
      // Forward
      for (let i = 0; i < delta; i++) {
        await gamepad.rb();
      }
    }

    this.currentFilterIndex = targetIndex;
    await browser.pause(300); // Wait for filter animation
  }

  /**
   * Reset filter tracker to "all" without pressing any keys.
   * Call this if you've navigated away from the library and come back.
   */
  resetFilterState(): void {
    this.currentFilterIndex = 0;
  }

  /** Check if filters bar is visible */
  async hasFilters(): Promise<boolean> {
    const el = await $(Selectors.filters.nav);
    return el.isDisplayed().catch(() => false);
  }
}
