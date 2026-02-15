import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsStore from "@/components/settings/store/SettingsStore.vue";

const mockOnGamepad = vi.fn();
const mockFetchGames = vi.fn();
const mockGetStoresStatus = vi.fn();
const mockSync = vi.fn();

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({ on: (...args: unknown[]) => mockOnGamepad(...args) }),
}));

vi.mock("@/stores/library", () => ({
  useLibraryStore: () => ({ fetchGames: (...args: unknown[]) => mockFetchGames(...args) }),
}));

vi.mock("@/services", () => ({
  getOrchestrator: () => ({
    getStoresStatus: (...args: unknown[]) => mockGetStoresStatus(...args),
  }),
}));

vi.mock("@/lib/sync", () => ({
  GameSyncService: {
    getInstance: () => ({ sync: (...args: unknown[]) => mockSync(...args) }),
  },
}));

describe("SettingsStore component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoresStatus.mockResolvedValue([
      { store: "epic", authenticated: false, gamesCount: 0 },
      { store: "gog", authenticated: true, gamesCount: 4 },
      { store: "amazon", authenticated: false, gamesCount: 0 },
      { store: "steam", authenticated: true, gamesCount: 10 },
    ]);
    mockSync.mockResolvedValue({ total: 14, enriched: 6 });
    mockFetchGames.mockResolvedValue(undefined);
  });

  it("loads and renders store statuses", async () => {
    const wrapper = mount(SettingsStore, {
      global: {
        stubs: {
          Info: true,
          EpicAuthModal: true,
          GOGAuthModal: true,
          AmazonAuthModal: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetStoresStatus).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Epic Games");
    expect(wrapper.text()).toContain("GOG Galaxy");
    expect(wrapper.text()).toContain("Steam");
  });

  it("toggleConnection opens the right modal per store", async () => {
    const wrapper = mount(SettingsStore, {
      global: {
        stubs: {
          Info: true,
          EpicAuthModal: true,
          GOGAuthModal: true,
          AmazonAuthModal: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const vm = wrapper.vm as any;

    vm.toggleConnection({ id: "epic", authenticated: false, name: "Epic" });
    await wrapper.vm.$nextTick();
    expect(vm.showEpicModal).toBe(true);

    vm.toggleConnection({ id: "gog", authenticated: false, name: "GOG" });
    await wrapper.vm.$nextTick();
    expect(vm.showGOGModal).toBe(true);

    vm.toggleConnection({ id: "amazon", authenticated: false, name: "Amazon" });
    await wrapper.vm.$nextTick();
    expect(vm.showAmazonModal).toBe(true);

    // Steam path (no modal open)
    vm.toggleConnection({ id: "steam", authenticated: false, name: "Steam" });
  });

  it("handleAuthSuccess triggers sync and reload operations", async () => {
    const wrapper = mount(SettingsStore, {
      global: {
        stubs: {
          Info: true,
          EpicAuthModal: true,
          GOGAuthModal: true,
          AmazonAuthModal: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const vm = wrapper.vm as any;
    await vm.handleAuthSuccess();

    expect(mockSync).toHaveBeenCalled();
    expect(mockGetStoresStatus).toHaveBeenCalledTimes(3);
    expect(mockFetchGames).toHaveBeenCalled();
  });

  it("computes icon/status helpers", async () => {
    const wrapper = mount(SettingsStore, {
      global: {
        stubs: {
          Info: true,
          EpicAuthModal: true,
          GOGAuthModal: true,
          AmazonAuthModal: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.storeIconClass("steam")).toContain("#1b2838");
    expect(vm.storeStatusClass({ authenticated: true, available: true })).toBe("text-green-500");
    expect(vm.storeStatusClass({ authenticated: false, available: true })).toBe("text-yellow-500");
    expect(vm.storeStatusClass({ authenticated: false, available: false })).toBe("text-white/40");

    expect(vm.storeStatusText({ authenticated: true, username: "bob", gamesCount: 2 })).toContain(
      "CONNECTÉ",
    );
    expect(vm.storeStatusText({ authenticated: false, available: true })).toBe(
      "DÉTECTÉ — NON CONNECTÉ",
    );
    expect(vm.storeStatusText({ authenticated: false, available: false })).toBe("NON DÉTECTÉ");
  });
});
