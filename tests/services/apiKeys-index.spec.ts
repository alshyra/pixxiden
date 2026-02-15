import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadConfig = vi.fn();
const mockSaveConfig = vi.fn();
const mockSteamGridTest = vi.fn();
const mockIgdbTest = vi.fn();
const mockSteamTest = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock("@/services/api/apiKeys/ConfigManager", () => ({
  loadConfig: () => mockLoadConfig(),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
}));

vi.mock("@/services/api/apiKeys/SteamGridDBStore", () => ({
  SteamGridDBStore: class {
    test(credentials: Record<string, string>) {
      return mockSteamGridTest(credentials);
    }
  },
}));

vi.mock("@/services/api/apiKeys/IGDBStore", () => ({
  IGDBStore: class {
    test(credentials: Record<string, string>) {
      return mockIgdbTest(credentials);
    }
    getAccessToken(clientId: string, clientSecret: string) {
      return mockGetAccessToken(clientId, clientSecret);
    }
  },
}));

vi.mock("@/services/api/apiKeys/SteamStore", () => ({
  SteamStore: class {
    test(credentials: Record<string, string>) {
      return mockSteamTest(credentials);
    }
  },
}));

import {
  getApiKeys,
  needsSetup,
  saveApiKeys,
  skipSetup,
  testApiKeys,
  getIGDBAccessToken,
} from "@/services/api/apiKeys";

describe("apiKeys index service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadConfig.mockResolvedValue({
      steamgriddbApiKey: null,
      igdbClientId: null,
      igdbClientSecret: null,
      igdbAccessToken: null,
      igdbTokenExpiresAt: null,
      steamApiKey: null,
      steamId: null,
      setupCompleted: false,
      hasSteamgriddb: false,
      hasIgdb: false,
      hasSteam: false,
    });
    mockSaveConfig.mockResolvedValue(undefined);
    mockSteamGridTest.mockResolvedValue({ valid: true, message: "ok" });
    mockIgdbTest.mockResolvedValue({ valid: true, message: "ok" });
    mockSteamTest.mockResolvedValue({ valid: true, message: "ok" });
    mockGetAccessToken.mockResolvedValue("token-123");
  });

  it("returns config from getApiKeys", async () => {
    const config = await getApiKeys();
    expect(config.setupCompleted).toBe(false);
  });

  it("needsSetup returns true when not completed", async () => {
    await expect(needsSetup()).resolves.toBe(true);

    mockLoadConfig.mockResolvedValueOnce({ setupCompleted: true });
    await expect(needsSetup()).resolves.toBe(false);
  });

  it("needsSetup defaults true on error", async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error("load failed"));
    await expect(needsSetup()).resolves.toBe(true);
  });

  it("saveApiKeys merges request and marks setup completed", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      steamgriddbApiKey: "old",
      igdbClientId: null,
      igdbClientSecret: null,
      igdbAccessToken: null,
      igdbTokenExpiresAt: null,
      steamApiKey: null,
      steamId: null,
      setupCompleted: false,
      hasSteamgriddb: true,
      hasIgdb: false,
      hasSteam: false,
    });

    const updated = await saveApiKeys({ igdbClientId: "id", markSetupCompleted: true });

    expect(updated.steamgriddbApiKey).toBe("old");
    expect(updated.igdbClientId).toBe("id");
    expect(updated.setupCompleted).toBe(true);
    expect(mockSaveConfig).toHaveBeenCalled();
  });

  it("skipSetup delegates to saveApiKeys path", async () => {
    await skipSetup();
    expect(mockSaveConfig).toHaveBeenCalled();
  });

  it("testApiKeys runs all stores and stores IGDB access token", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      steamgriddbApiKey: null,
      igdbClientId: "id",
      igdbClientSecret: "secret",
      igdbAccessToken: null,
      igdbTokenExpiresAt: null,
      steamApiKey: "steam-key",
      steamId: "7656119",
      setupCompleted: false,
      hasSteamgriddb: false,
      hasIgdb: true,
      hasSteam: true,
    });

    const result = await testApiKeys({
      steamgriddbApiKey: "sgdb",
      igdbClientId: "id",
      igdbClientSecret: "secret",
      steamApiKey: "steam-key",
      steamId: "7656119",
    });

    expect(result.steamgriddbValid).toBe(true);
    expect(result.igdbValid).toBe(true);
    expect(result.steamValid).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledWith("id", "secret");
    expect(mockSaveConfig).toHaveBeenCalled();
  });

  it("testApiKeys continues when storing IGDB token fails", async () => {
    mockSaveConfig.mockRejectedValueOnce(new Error("save failed"));

    const result = await testApiKeys({ igdbClientId: "id", igdbClientSecret: "secret" });
    expect(result.igdbValid).toBe(true);
  });

  it("getIGDBAccessToken returns null when credentials missing", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      igdbClientId: null,
      igdbClientSecret: null,
      igdbAccessToken: null,
      igdbTokenExpiresAt: null,
    });

    await expect(getIGDBAccessToken()).resolves.toBeNull();
  });

  it("getIGDBAccessToken returns cached token when not expired", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      igdbClientId: "id",
      igdbClientSecret: "secret",
      igdbAccessToken: "cached",
      igdbTokenExpiresAt: Date.now() + 100000,
    });

    await expect(getIGDBAccessToken()).resolves.toBe("cached");
  });

  it("getIGDBAccessToken refreshes token when expired", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      igdbClientId: "id",
      igdbClientSecret: "secret",
      igdbAccessToken: "old",
      igdbTokenExpiresAt: Date.now() - 1000,
    });
    mockGetAccessToken.mockResolvedValueOnce("new-token");

    await expect(getIGDBAccessToken()).resolves.toBe("new-token");
    expect(mockSaveConfig).toHaveBeenCalled();
  });

  it("getIGDBAccessToken returns null on refresh failure", async () => {
    mockLoadConfig.mockResolvedValueOnce({
      igdbClientId: "id",
      igdbClientSecret: "secret",
      igdbAccessToken: "old",
      igdbTokenExpiresAt: Date.now() - 1000,
    });
    mockGetAccessToken.mockRejectedValueOnce(new Error("refresh failed"));

    await expect(getIGDBAccessToken()).resolves.toBeNull();
  });
});
