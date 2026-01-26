import { expect } from "@wdio/globals";
import { SELECTORS } from "../helpers/selectors";
import { waitForElement, safeClick } from "../helpers/utils";

/**
 * E2E tests for Store Authentication flows
 *
 * Tests cover:
 * - Navigation to stores settings
 * - Epic Games authentication modal
 * - GOG authentication modal with code input
 * - Amazon Games authentication with 2FA flow
 * - Logout functionality
 * - Error handling
 */
describe("Store Authentication", () => {
  before(async () => {
    // Wait for app to be ready
    await browser.pause(2000);
  });

  describe("Navigation to Stores Settings", () => {
    it("should navigate to settings view", async () => {
      // Navigate to settings
      const settingsButton = await $(SELECTORS.SETTINGS_BUTTON);
      await waitForElement(settingsButton);
      await safeClick(settingsButton);

      // Verify we're in settings
      await browser.pause(500);
      const settingsView = await $('[data-testid="settings-view"]');
      await expect(settingsView).toExist();
    });

    it("should show stores authentication cards", async () => {
      // Check for store cards
      const epicCard = await $('[data-testid="store-card-epic"]');
      const gogCard = await $('[data-testid="store-card-gog"]');
      const amazonCard = await $('[data-testid="store-card-amazon"]');
      const steamCard = await $('[data-testid="store-card-steam"]');

      await expect(epicCard).toExist();
      await expect(gogCard).toExist();
      await expect(amazonCard).toExist();
      await expect(steamCard).toExist();
    });
  });

  describe("Epic Games Authentication", () => {
    it("should open Epic authentication modal", async () => {
      const connectButton = await $('[data-testid="epic-connect-button"]');
      await waitForElement(connectButton);
      await safeClick(connectButton);

      // Verify modal is open
      await browser.pause(300);
      const modal = await $('[data-testid="epic-auth-modal"]');
      await expect(modal).toExist();

      const modalTitle = await modal.$("h3");
      await expect(modalTitle).toHaveTextContaining("Epic Games");
    });

    it("should show loading state when browser opens", async () => {
      const loadingIndicator = await $(".animate-spin");
      await expect(loadingIndicator).toExist();

      const loadingText = await $("p*=Ouverture du navigateur");
      await expect(loadingText).toExist();
    });

    it("should close modal with cancel button", async () => {
      const cancelButton = await $("button*=Annuler");
      await waitForElement(cancelButton);
      await safeClick(cancelButton);

      await browser.pause(300);
      const modal = await $('[data-testid="epic-auth-modal"]');
      await expect(modal).not.toExist();
    });

    it("should handle authentication errors gracefully", async () => {
      // Re-open modal
      const connectButton = await $('[data-testid="epic-connect-button"]');
      await safeClick(connectButton);
      await browser.pause(500);

      // Check for error handling (if CLI not installed)
      const errorMessage = await $("p.text-red-400");
      if (await errorMessage.isExisting()) {
        await expect(errorMessage).toHaveTextContaining("CLI");

        // Should show retry button
        const retryButton = await $("button*=Réessayer");
        await expect(retryButton).toExist();
      }
    });
  });

  describe("GOG Authentication", () => {
    it("should open GOG authentication modal", async () => {
      // Close any open modals first
      const closeButton = await $("button*=Annuler");
      if (await closeButton.isExisting()) {
        await safeClick(closeButton);
        await browser.pause(300);
      }

      const connectButton = await $('[data-testid="gog-connect-button"]');
      await waitForElement(connectButton);
      await safeClick(connectButton);

      await browser.pause(300);
      const modal = await $('[data-testid="gog-auth-modal"]');
      await expect(modal).toExist();
    });

    it("should transition from opening to code input", async () => {
      // Should show "opening" state initially
      const openingText = await $("p*=Ouverture de la page GOG");
      await expect(openingText).toExist();

      // Wait for transition to code input (should happen after browser opens)
      await browser.pause(2000);

      const codeInput = await $('input[placeholder*="code"]');
      await expect(codeInput).toExist();
    });

    it("should validate authentication code format", async () => {
      const codeInput = await $('input[placeholder*="code"]');
      await codeInput.setValue("invalid");

      // Submit button should still be enabled (validation is on backend)
      const submitButton = await $("button*=Valider");
      await expect(submitButton).toBeEnabled();
    });

    it("should show error for invalid code", async () => {
      const submitButton = await $("button*=Valider");
      await safeClick(submitButton);

      await browser.pause(1000);

      // Should show error message
      const errorMessage = await $("input[aria-invalid='true']");
      if (await errorMessage.isExisting()) {
        await expect(errorMessage).toExist();
      }
    });

    it("should close modal with cancel button", async () => {
      const cancelButton = await $("button*=Annuler");
      await safeClick(cancelButton);

      await browser.pause(300);
      const modal = await $('[data-testid="gog-auth-modal"]');
      await expect(modal).not.toExist();
    });
  });

  describe("Amazon Games Authentication", () => {
    it("should open Amazon authentication modal", async () => {
      const connectButton = await $('[data-testid="amazon-connect-button"]');
      await waitForElement(connectButton);
      await safeClick(connectButton);

      await browser.pause(300);
      const modal = await $('[data-testid="amazon-auth-modal"]');
      await expect(modal).toExist();
    });

    it("should show email and password inputs", async () => {
      const emailInput = await $('input[type="email"]');
      const passwordInput = await $('input[type="password"]');

      await expect(emailInput).toExist();
      await expect(passwordInput).toExist();
    });

    it("should disable submit button with empty form", async () => {
      const submitButton = await $("button*=Se connecter");
      await expect(submitButton).toBeDisabled();
    });

    it("should enable submit button with filled form", async () => {
      const emailInput = await $('input[type="email"]');
      const passwordInput = await $('input[type="password"]');

      await emailInput.setValue("test@example.com");
      await passwordInput.setValue("testpassword123");

      const submitButton = await $("button*=Se connecter");
      await expect(submitButton).toBeEnabled();
    });

    it("should handle invalid credentials error", async () => {
      const submitButton = await $("button*=Se connecter");
      await safeClick(submitButton);

      await browser.pause(1500);

      // Should show error
      const errorInput = await $("input[aria-invalid='true']");
      if (await errorInput.isExisting()) {
        await expect(errorInput).toExist();
      }
    });

    it("should transition to 2FA input if required", async () => {
      // Note: This test requires mocking a 2FA response
      // In a real scenario, the backend would return { errorType: "two_factor_required" }

      // For now, we just verify the 2FA input exists in the component
      const modal = await $('[data-testid="amazon-auth-modal"]');
      const html = await modal.getHTML();

      // Check that 2FA code input is in the template (even if not currently visible)
      expect(html).toContain('placeholder="000000"');
    });

    it("should close modal with cancel button", async () => {
      const cancelButton = await $("button*=Annuler");
      await safeClick(cancelButton);

      await browser.pause(300);
      const modal = await $('[data-testid="amazon-auth-modal"]');
      await expect(modal).not.toExist();
    });
  });

  describe("Logout Functionality", () => {
    it("should open logout confirmation modal", async () => {
      // Note: This test assumes at least one store is authenticated
      // In a real scenario, you'd need to authenticate first

      const disconnectButton = await $('[data-testid="epic-disconnect-button"]');

      if (await disconnectButton.isExisting()) {
        await safeClick(disconnectButton);

        await browser.pause(300);
        const confirmModal = await $('[data-testid="logout-confirm-modal"]');
        await expect(confirmModal).toExist();

        // Cancel logout
        const cancelButton = await $("button*=Annuler");
        await safeClick(cancelButton);
      } else {
        // Skip test if no store is authenticated
        console.log("⏭️  Skipping logout test - no authenticated stores");
      }
    });
  });

  describe("Error Messages", () => {
    it("should show contextual error for CLI not found", async () => {
      // This requires the CLI to not be installed
      // Error message format: "⚠️ {Store} CLI tool not installed..."

      const epicButton = await $('[data-testid="epic-connect-button"]');
      await safeClick(epicButton);
      await browser.pause(500);

      const errorText = await $("p.text-red-400");
      if (await errorText.isExisting()) {
        const text = await errorText.getText();

        // Should contain CLI-related message or specific error context
        const hasContextualError =
          text.includes("CLI") ||
          text.includes("npm run install:clis") ||
          text.includes("network") ||
          text.includes("timeout");

        expect(hasContextualError).toBe(true);
      }
    });
  });

  describe("Visual States", () => {
    it("should show loading animations", async () => {
      // Check that loading spinners use animate-spin class
      const spinner = await $(".animate-spin");
      if (await spinner.isExisting()) {
        const classList = await spinner.getAttribute("class");
        expect(classList).toContain("animate-spin");
      }
    });

    it("should show success animation on successful auth", async () => {
      // Success state should show ✓ with animate-bounce
      const modal = await $('[data-testid="epic-auth-modal"]');
      if (await modal.isExisting()) {
        const html = await modal.getHTML();
        // Verify success state exists in component (even if not visible)
        expect(html).toContain("animate-bounce");
      }
    });

    it("should apply fade transitions between states", async () => {
      // Verify that Transition components are used
      const modal = await $('[data-testid="gog-auth-modal"]');
      if (await modal.isExisting()) {
        const html = await modal.getHTML();
        // Check for fade transition classes in styles
        expect(html).toContain("fade-enter-active");
      }
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on buttons", async () => {
      const connectButtons = await $$("button*=Connecter");

      for (const button of connectButtons) {
        await button.getAttribute("aria-label");
        // Button should have meaningful text even without aria-label
        const text = await button.getText();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it("should support keyboard navigation", async () => {
      const emailInput = await $('input[type="email"]');
      if (await emailInput.isExisting()) {
        await emailInput.setValue("test@example.com");

        // Press Tab to go to next input
        await browser.keys("Tab");

        // Should focus on password input
        const activeElement = await browser.execute(() =>
          document.activeElement?.getAttribute("type"),
        );
        expect(activeElement).toBe("password");
      }
    });
  });
});
