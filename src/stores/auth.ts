import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { AuthStatus, StoreType } from "@/types";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

interface AuthState {
  stores: Record<StoreType, AuthStatus>;
  loading: boolean;
  error: string | null;
}

/**
 * Helper function to format error messages with context
 */
function formatAuthError(store: string, action: string, error: any): string {
  const baseMessage = error?.message || error?.toString() || "Unknown error";

  // Common error patterns
  if (baseMessage.includes("timeout")) {
    return `⏱️ ${store} authentication timeout. Please check your internet connection.`;
  }

  if (baseMessage.includes("network") || baseMessage.includes("connection")) {
    return `🌐 Cannot reach ${store} servers. Please verify your network connection.`;
  }

  if (baseMessage.includes("invalid") && baseMessage.includes("credentials")) {
    return `🔐 Invalid credentials for ${store}. Please check your email and password.`;
  }

  if (baseMessage.includes("code") && baseMessage.includes("invalid")) {
    return `❌ Invalid ${store} authentication code. Please verify and try again.`;
  }

  if (baseMessage.includes("browser")) {
    return `🌐 Failed to open browser for ${store}. Please try opening manually.`;
  }

  if (baseMessage.includes("CLI not found") || baseMessage.includes("command not found")) {
    return `⚠️ ${store} CLI tool not installed. Please run: npm run install:clis`;
  }

  // Fallback with action context
  return `❌ ${store} ${action} failed: ${baseMessage}`;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    stores: {
      epic: { authenticated: false, configSource: "none" },
      gog: { authenticated: false, configSource: "none" },
      amazon: { authenticated: false, configSource: "none" },
      steam: { authenticated: false, configSource: "none" },
    },
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * Get authentication status for a specific store
     */
    getStoreStatus:
      (state) =>
      (store: StoreType): AuthStatus => {
        return state.stores[store];
      },

    /**
     * Check if any store is authenticated
     */
    hasAnyAuthentication: (state): boolean => {
      return Object.values(state.stores).some((status) => status.authenticated);
    },

    /**
     * Get list of authenticated stores
     */
    authenticatedStores: (state): StoreType[] => {
      return Object.entries(state.stores)
        .filter(([_, status]) => status.authenticated)
        .map(([store]) => store as StoreType);
    },
  },

  actions: {
    /**
     * Fetch authentication status for all stores
     */
    async fetchAuthStatus() {
      this.loading = true;
      this.error = null;

      try {
        const statuses = await invoke<Record<string, AuthStatus>>("get_stores_auth_status");

        // Update store state
        this.stores.epic = statuses.epic || { authenticated: false, configSource: "none" };
        this.stores.gog = statuses.gog || { authenticated: false, configSource: "none" };
        this.stores.amazon = statuses.amazon || { authenticated: false, configSource: "none" };
        this.stores.steam = statuses.steam || { authenticated: false, configSource: "none" };
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Failed to fetch auth status";
        console.error("Error fetching auth status:", error);
      } finally {
        this.loading = false;
      }
    },

    // ===== Epic Games =====

    /**
     * Start Epic Games authentication (OAuth flow)
     */
    async loginEpic(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        // Lancer le flow (ouvre la webview)
        await invoke("epic_start_auth");

        // Écouter l'événement de fin d'auth
        const unlisten = await WebviewWindow.getByLabel("epic-login");
        unlisten?.listen(
          "epic-auth-complete",
          async (event) => {
            const authCode = event.payload as string;

            // Envoyer le code au backend
            await invoke("epic_complete_auth", { authCode });

            // Fermer la webview
            const webview = await WebviewWindow.getByLabel("epic-login");
            await webview?.close();

            unlisten.destroy();
          },
        );
      } catch (error) {
        console.error("Epic auth failed:", error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout from Epic Games
     */
    async logoutEpic(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("epic_logout");
        await this.fetchAuthStatus();
      } catch (error) {
        this.error = formatAuthError("Epic Games", "logout", error);
        console.error("Failed to logout from Epic:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ===== GOG =====

    /**
     * Get GOG authentication URL
     */
    async getGOGAuthUrl(): Promise<string> {
      try {
        return await invoke<string>("gog_get_auth_url");
      } catch (error) {
        this.error = formatAuthError("GOG", "URL generation", error);
        console.error("Failed to get GOG auth URL:", error);
        throw error;
      }
    },

    /**
     * Login to GOG with authentication code
     */
    async loginGOG(code: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("gog_login_with_code", { code });
        await this.fetchAuthStatus();
      } catch (error) {
        this.error = formatAuthError("GOG", "authentication", error);
        console.error("Failed to login to GOG:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout from GOG
     */
    async logoutGOG(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("gog_logout");
        await this.fetchAuthStatus();
      } catch (error) {
        this.error = formatAuthError("GOG", "logout", error);
        console.error("Failed to logout from GOG:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ===== Amazon Games =====

    /**
     * Login to Amazon Games
     * @throws AuthErrorResponse if 2FA is required or credentials are invalid
     */
    async loginAmazon(email: string, password: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("amazon_login", { email, password });
        await this.fetchAuthStatus();
      } catch (error: any) {
        // Check if error is an AuthErrorResponse
        if (error?.errorType === "two_factor_required") {
          this.error = "🔒 Two-factor authentication required. Please enter your 2FA code.";
          throw error; // Re-throw to let UI handle 2FA flow
        }

        this.error = formatAuthError("Amazon Games", "authentication", error);
        console.error("Failed to login to Amazon:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Login to Amazon Games with 2FA
     */
    async loginAmazonWith2FA(email: string, password: string, code: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("amazon_login_with_2fa", { email, password, code });
        await this.fetchAuthStatus();
      } catch (error: any) {
        this.error = formatAuthError("Amazon Games", "2FA verification", error);
        console.error("Failed to complete Amazon 2FA:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout from Amazon Games
     */
    async logoutAmazon(): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await invoke("amazon_logout");
        await this.fetchAuthStatus();
      } catch (error) {
        this.error = formatAuthError("Amazon Games", "logout", error);
        console.error("Failed to logout from Amazon:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout from a specific store
     */
    async logout(store: StoreType): Promise<void> {
      switch (store) {
        case "epic":
          return this.logoutEpic();
        case "gog":
          return this.logoutGOG();
        case "amazon":
          return this.logoutAmazon();
        case "steam":
          throw new Error("Steam does not require authentication");
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null;
    },
  },
});
