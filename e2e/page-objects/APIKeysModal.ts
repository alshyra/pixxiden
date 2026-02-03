/**
 * Page Object Model for API Keys Setup Modal
 * Handles the initial API keys configuration
 */

export class APIKeysModal {
  /**
   * Check if API keys setup modal is shown
   */
  async isShown(): Promise<boolean> {
    const bodyText = await $("body").getText();
    return (
      bodyText.includes("API") &&
      bodyText.includes("clés") &&
      (bodyText.includes("configuration") || bodyText.includes("Configurer"))
    );
  }

  /**
   * Click the skip button
   */
  async clickSkip() {
    const buttons = await $$("button");
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes("Passer") || text.includes("Skip") || text.includes("Plus tard")) {
        await btn.click();
        await browser.pause(1000);
        return true;
      }
    }
    return false;
  }

  /**
   * Click the configure button
   */
  async clickConfigure() {
    const buttons = await $$("button");
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes("Configurer") || text.includes("Configure")) {
        await btn.click();
        await browser.pause(1000);
        return true;
      }
    }
    return false;
  }
}
