import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

const mockAuthService = {
  getAllAuthStatus: vi.fn(),
  startEpicAuth: vi.fn(),
  logoutEpic: vi.fn(),
  getGogAuthUrl: vi.fn(),
  completeGogAuth: vi.fn(),
  logoutGog: vi.fn(),
  loginAmazon: vi.fn(),
  loginAmazonWith2FA: vi.fn(),
  logoutAmazon: vi.fn(),
};

vi.mock("@/services", () => ({
  getAuthService: () => mockAuthService,
}));

describe("Auth Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockAuthService.getAllAuthStatus.mockResolvedValue({
      epic: { authenticated: true, configSource: "pixxiden" },
      gog: { authenticated: false, configSource: "none" },
      amazon: { authenticated: false, configSource: "none" },
      steam: { authenticated: true, configSource: "pixxiden" },
    });
  });

  it("fetches auth status and updates computed state", async () => {
    const store = useAuthStore();

    await store.fetchAuthStatus();

    expect(store.stores.epic.authenticated).toBe(true);
    expect(store.stores.steam.authenticated).toBe(true);
    expect(store.hasAnyAuthentication).toBe(true);
    expect(store.authenticatedStores).toContain("epic");
    expect(store.authenticatedStores).toContain("steam");
  });

  it("sets generic error when fetchAuthStatus fails", async () => {
    const store = useAuthStore();
    mockAuthService.getAllAuthStatus.mockRejectedValueOnce(new Error("boom"));

    await store.fetchAuthStatus();

    expect(store.error).toBe("boom");
    expect(store.loading).toBe(false);
  });

  it("sets store authenticated state manually", () => {
    const store = useAuthStore();

    store.setStoreAuthenticated("gog", true);
    expect(store.getStoreStatus("gog").authenticated).toBe(true);
    expect(store.getStoreStatus("gog").configSource).toBe("pixxiden");

    store.setStoreAuthenticated("gog", false);
    expect(store.getStoreStatus("gog").authenticated).toBe(false);
    expect(store.getStoreStatus("gog").configSource).toBe("none");
  });

  it("returns Epic auth URL on loginEpic success", async () => {
    const store = useAuthStore();
    mockAuthService.startEpicAuth.mockResolvedValueOnce("https://epic-auth");

    const url = await store.loginEpic();

    expect(url).toBe("https://epic-auth");
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it("formats timeout message on loginEpic error", async () => {
    const store = useAuthStore();
    mockAuthService.startEpicAuth.mockRejectedValueOnce(new Error("timeout while opening browser"));

    await expect(store.loginEpic()).rejects.toThrow();
    expect(store.error).toContain("timeout");
  });

  it("returns GOG OAuth URL", () => {
    const store = useAuthStore();
    mockAuthService.getGogAuthUrl.mockReturnValueOnce("https://gog-auth");

    expect(store.getGOGAuthUrl()).toBe("https://gog-auth");
  });

  it("formats invalid code message on loginGOG failure", async () => {
    const store = useAuthStore();
    mockAuthService.completeGogAuth.mockRejectedValueOnce(new Error("code invalid"));

    await expect(store.loginGOG("abc")).rejects.toThrow();
    expect(store.error).toContain("Invalid GOG authentication code");
  });

  it("handles Amazon 2FA-required branch", async () => {
    const store = useAuthStore();
    mockAuthService.loginAmazon.mockRejectedValueOnce({ errorType: "two_factor_required" });

    await expect(store.loginAmazon("a@b.c", "pass")).rejects.toEqual({
      errorType: "two_factor_required",
    });
    expect(store.error).toContain("Two-factor authentication required");
  });

  it("formats network message on Amazon login error", async () => {
    const store = useAuthStore();
    mockAuthService.loginAmazon.mockRejectedValueOnce(new Error("network connection refused"));

    await expect(store.loginAmazon("a@b.c", "pass")).rejects.toThrow();
    expect(store.error).toContain("Cannot reach Amazon Games servers");
  });

  it("throws on steam logout via generic logout", async () => {
    const store = useAuthStore();

    await expect(store.logout("steam")).rejects.toThrow("Steam does not require authentication");
  });

  it("clears error", () => {
    const store = useAuthStore();
    store.error = "some error";

    store.clearError();

    expect(store.error).toBeNull();
  });
});
