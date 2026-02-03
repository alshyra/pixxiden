import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AuthStatus, StoreType } from "@/types";
import { getAuthService } from "@/services";

/**
 * Helper function to format error messages with context
 */
function formatAuthError(store: string, action: string, error: unknown): string {
  const baseMessage = error instanceof Error ? error.message : String(error) || "Unknown error";

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

export const useAuthStore = defineStore("auth", () => {
  // State
  const stores = ref<Record<StoreType, AuthStatus>>({
    epic: { authenticated: false, configSource: "none" },
    gog: { authenticated: false, configSource: "none" },
    amazon: { authenticated: false, configSource: "none" },
    steam: { authenticated: false, configSource: "none" },
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed: Get authentication status for a specific store
  const getStoreStatus = computed(() => (store: StoreType): AuthStatus => {
    return stores.value[store];
  });

  // Computed: Check if any store is authenticated
  const hasAnyAuthentication = computed(() => {
    return Object.values(stores.value).some((status) => status.authenticated);
  });

  // Computed: Get list of authenticated stores
  const authenticatedStores = computed(() => {
    return Object.entries(stores.value)
      .filter(([_, status]) => status.authenticated)
      .map(([store]) => store as StoreType);
  });

  // Actions
  async function fetchAuthStatus() {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      const statuses = await auth.getAllAuthStatus();

      // Update store state
      stores.value.epic = statuses.epic;
      stores.value.gog = statuses.gog;
      stores.value.amazon = statuses.amazon;
      stores.value.steam = statuses.steam;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch auth status";
      console.error("Error fetching auth status:", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set authentication status for a store (used by webview handlers)
   */
  function setStoreAuthenticated(store: StoreType, authenticated: boolean): void {
    stores.value[store] = {
      authenticated,
      configSource: authenticated ? "pixxiden" : "none",
    };
  }

  // ===== Epic Games =====

  async function loginEpic(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.startEpicAuth();
      await fetchAuthStatus();
    } catch (err) {
      error.value = formatAuthError("Epic Games", "authentication", err);
      console.error("Epic auth failed:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logoutEpic(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.logoutEpic();
      await fetchAuthStatus();
    } catch (err) {
      error.value = formatAuthError("Epic Games", "logout", err);
      console.error("Failed to logout from Epic:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ===== GOG =====

  async function loginGOG(_code?: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.startGogAuth();
      await fetchAuthStatus();
    } catch (err) {
      error.value = formatAuthError("GOG", "authentication", err);
      console.error("Failed to login to GOG:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logoutGOG(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.logoutGog();
      await fetchAuthStatus();
    } catch (err) {
      error.value = formatAuthError("GOG", "logout", err);
      console.error("Failed to logout from GOG:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ===== Amazon Games =====

  async function loginAmazon(email: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.loginAmazon(email, password);
      await fetchAuthStatus();
    } catch (err: unknown) {
      // Check if error is an AuthErrorResponse (2FA required)
      if (
        err &&
        typeof err === "object" &&
        "errorType" in err &&
        (err as { errorType: string }).errorType === "two_factor_required"
      ) {
        error.value = "🔒 Two-factor authentication required. Please enter your 2FA code.";
        throw err;
      }

      error.value = formatAuthError("Amazon Games", "authentication", err);
      console.error("Failed to login to Amazon:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loginAmazonWith2FA(email: string, password: string, code: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.loginAmazonWith2FA(email, password, code);
      await fetchAuthStatus();
    } catch (err: unknown) {
      error.value = formatAuthError("Amazon Games", "2FA verification", err);
      console.error("Failed to complete Amazon 2FA:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logoutAmazon(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const auth = getAuthService();
      await auth.logoutAmazon();
      await fetchAuthStatus();
    } catch (err) {
      error.value = formatAuthError("Amazon Games", "logout", err);
      console.error("Failed to logout from Amazon:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ===== Generic =====

  async function logout(store: StoreType): Promise<void> {
    switch (store) {
      case "epic":
        return logoutEpic();
      case "gog":
        return logoutGOG();
      case "amazon":
        return logoutAmazon();
      case "steam":
        throw new Error("Steam does not require authentication");
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    stores,
    loading,
    error,
    // Computed
    getStoreStatus,
    hasAnyAuthentication,
    authenticatedStores,
    // Actions
    fetchAuthStatus,
    setStoreAuthenticated,
    loginEpic,
    logoutEpic,
    loginGOG,
    logoutGOG,
    loginAmazon,
    loginAmazonWith2FA,
    logoutAmazon,
    logout,
    clearError,
  };
});
