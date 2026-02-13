import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const mockInitializeServices = vi.fn();
const mockGetGamesCount = vi.fn();
const mockSync = vi.fn();
const mockListen = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services", () => ({
  initializeServices: () => mockInitializeServices(),
}));

vi.mock("@/lib/database", () => ({
  GameRepository: {
    getInstance: () => ({
      getGamesCount: () => mockGetGamesCount(),
    }),
  },
}));

vi.mock("@/lib/sync", () => ({
  GameSyncService: {
    getInstance: () => ({
      sync: (options?: unknown) => mockSync(options),
    }),
  },
}));

import SplashScreen from "@/views/SplashScreen.vue";

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInitializeServices.mockResolvedValue(undefined);
    mockSync.mockResolvedValue({});
    mockListen.mockResolvedValue(() => {});
  });

  it("always triggers sync and skips enrichment when games already exist", async () => {
    mockGetGamesCount.mockResolvedValue(53);

    const wrapper = mount(SplashScreen, {
      global: {
        stubs: {
          PixxidenLogo: true,
        },
      },
    });

    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mockInitializeServices).toHaveBeenCalledTimes(1);
    expect(mockGetGamesCount).toHaveBeenCalledTimes(1);
    expect(mockSync).toHaveBeenCalledWith({ skipEnrichment: true });
    expect(wrapper.emitted("ready")).toBeTruthy();

    wrapper.unmount();
  });

  it("runs full sync on first run", async () => {
    mockGetGamesCount.mockResolvedValue(0);

    const wrapper = mount(SplashScreen, {
      global: {
        stubs: {
          PixxidenLogo: true,
        },
      },
    });

    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mockSync).toHaveBeenCalledWith({ skipEnrichment: false });
    expect(wrapper.emitted("ready")).toBeTruthy();

    wrapper.unmount();
  });
});
