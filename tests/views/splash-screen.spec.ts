import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const mockInitializeServices = vi.fn();
const mockGetGamesCount = vi.fn();
const mockSync = vi.fn();
const mockListen = vi.fn();
const mockFetchGames = vi.fn();
const mockStartBackgroundTask = vi.fn();
const mockNeedsRefresh = vi.fn();

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
  UmuRepository: {
    getInstance: () => ({
      needsRefresh: () => mockNeedsRefresh(),
      syncFromApi: vi.fn().mockResolvedValue(2000),
      getCount: vi.fn().mockResolvedValue(2000),
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

// Mock Pinia stores — the SplashScreen now imports useLibraryStore and useDownloadsStore
vi.mock("@/stores/library", () => ({
  useLibraryStore: () => ({
    initialized: false,
    fetchGames: mockFetchGames,
  }),
}));

vi.mock("@/stores/downloads", () => ({
  useDownloadsStore: () => ({
    startBackgroundTask: mockStartBackgroundTask,
  }),
}));

import SplashScreen from "@/views/SplashScreen.vue";

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInitializeServices.mockResolvedValue(undefined);
    mockSync.mockResolvedValue({});
    mockListen.mockResolvedValue(() => {});
    mockFetchGames.mockResolvedValue(undefined);
    mockStartBackgroundTask.mockResolvedValue(undefined);
    mockNeedsRefresh.mockResolvedValue(false);
    setActivePinia(createPinia());
  });

  it("loads from DB instantly and triggers background sync when games already exist", async () => {
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
    // Fast path: games loaded from DB, not via blocking sync
    expect(mockFetchGames).toHaveBeenCalledTimes(1);
    // Sync NOT called synchronously — it runs as a background task
    expect(mockSync).not.toHaveBeenCalled();
    // Background sync task was started
    expect(mockStartBackgroundTask).toHaveBeenCalledWith(
      "sync",
      "Synchronisation des bibliothèques",
      expect.any(Function),
    );
    expect(wrapper.emitted("ready")).toBeTruthy();

    wrapper.unmount();
  });

  it("runs full blocking sync on first run (empty DB)", async () => {
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

    // First run: blocking sync with enrichment
    expect(mockSync).toHaveBeenCalledWith({ skipEnrichment: false });
    // Games loaded after sync
    expect(mockFetchGames).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("ready")).toBeTruthy();

    wrapper.unmount();
  });

  it("triggers UMU DB sync in background when refresh is needed", async () => {
    mockGetGamesCount.mockResolvedValue(53);
    mockNeedsRefresh.mockResolvedValue(true);

    const wrapper = mount(SplashScreen, {
      global: {
        stubs: {
          PixxidenLogo: true,
        },
      },
    });

    await Promise.resolve();
    await vi.runAllTimersAsync();

    // UMU sync background task should be started
    expect(mockStartBackgroundTask).toHaveBeenCalledWith(
      "umu-sync",
      "Mise à jour base UMU",
      expect.any(Function),
    );

    wrapper.unmount();
  });
});
