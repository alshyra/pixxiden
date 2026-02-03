/**
 * Page Object Model for Library Page
 * Handles the game library view
 */

export class LibraryPage {
  /**
   * Check if showing empty state (no games)
   */
  async hasEmptyState(): Promise<boolean> {
    const bodyText = await $("body").getText();
    return (
      bodyText.includes("Connectez vos stores") ||
      bodyText.includes("Aucun jeu") ||
      bodyText.includes("bibliothèque vide")
    );
  }

  /**
   * Check if showing games UI
   */
  async hasGamesUI(): Promise<boolean> {
    const homeButton = await $("button[aria-label='Accueil']");
    return await homeButton.isExisting();
  }

  /**
   * Check if library UI is displayed
   */
  async hasLibraryUI(): Promise<boolean> {
    const bodyText = await $("body").getText();
    return bodyText.length > 0;
  }

  /**
   * Navigate to library home
   */
  async navigateHome() {
    const homeButton = await $("button[aria-label='Accueil']");
    if (await homeButton.isExisting()) {
      await homeButton.click();
      await browser.pause(1000);
    }
  }

  /**
   * Check if redirected to settings
   */
  async isRedirectedToSettings(): Promise<boolean> {
    const url = await browser.getUrl();
    return url.includes("settings");
  }
}
