import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsSystem from "@/components/settings/system/SettingsSystem.vue";

const mockOnGamepad = vi.fn();
const mockSyncLibrary = vi.fn();
const mockResyncLibrary = vi.fn();
const mockGetSystemInfo = vi.fn();
const mockGetDiskInfo = vi.fn();

const mockLibraryStore = {
  syncing: false,
  games: [{ id: "g1" }, { id: "g2" }, { id: "g3" }],
  syncLibrary: (...args: unknown[]) => mockSyncLibrary(...args),
  resyncLibrary: (...args: unknown[]) => mockResyncLibrary(...args),
};

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({ on: (...args: unknown[]) => mockOnGamepad(...args) }),
}));

vi.mock("@/stores/library", () => ({
  useLibraryStore: () => mockLibraryStore,
}));

vi.mock("@/services/api", () => ({
  getSystemInfo: (...args: unknown[]) => mockGetSystemInfo(...args),
  getDiskInfo: (...args: unknown[]) => mockGetDiskInfo(...args),
}));

describe("SettingsSystem (vm methods)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLibraryStore.syncing = false;
    mockLibraryStore.games = [{ id: "g1" }, { id: "g2" }, { id: "g3" }];

    mockGetSystemInfo.mockResolvedValue({
      osName: "Linux",
      kernelVersion: "6.8.0",
      cpuBrand: "Ryzen",
      totalMemory: 16 * 1024 * 1024 * 1024,
    });
    mockGetDiskInfo.mockResolvedValue([
      { mountPoint: "/", usedSpace: 50 * 1024 * 1024, totalSpace: 100 * 1024 * 1024 },
    ]);

    mockSyncLibrary.mockResolvedValue(undefined);
    mockResyncLibrary.mockResolvedValue(undefined);
  });

  it("loads system info via method", async () => {
    const wrapper = mount(SettingsSystem, {
      global: {
        stubs: {
          RefreshCw: true,
          SystemUpdates: true,
        },
      },
    });

    const vm = wrapper.vm as any;
    await vm.loadSystemInfo();

    expect(mockGetSystemInfo).toHaveBeenCalled();
    expect(mockGetDiskInfo).toHaveBeenCalled();
    expect(vm.systemInfo?.osName).toBe("Linux");
    expect(vm.diskInfo.length).toBe(1);
  });

  it("formats bytes helper", async () => {
    const wrapper = mount(SettingsSystem, {
      global: {
        stubs: {
          RefreshCw: true,
          SystemUpdates: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.formatBytes(0)).toBe("0 B");
    expect(vm.formatBytes(1024)).toContain("KB");
    expect(vm.formatBytes(1024 * 1024)).toContain("MB");
  });

  it("handleSync success and error branches", async () => {
    const wrapper = mount(SettingsSystem, {
      global: {
        stubs: {
          RefreshCw: true,
          SystemUpdates: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    await vm.handleSync();
    expect(mockSyncLibrary).toHaveBeenCalled();
    expect(vm.syncMessage).toContain("Synchronisation terminée");

    mockSyncLibrary.mockRejectedValueOnce(new Error("sync failed"));
    await vm.handleSync();
    expect(vm.syncMessage).toContain("Échec");
  });

  it("handleResync success and error branches", async () => {
    const wrapper = mount(SettingsSystem, {
      global: {
        stubs: {
          RefreshCw: true,
          SystemUpdates: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    await vm.handleResync();
    expect(mockResyncLibrary).toHaveBeenCalled();
    expect(vm.syncMessage).toContain("Re-synchronisation terminée");

    mockResyncLibrary.mockRejectedValueOnce(new Error("resync failed"));
    await vm.handleResync();
    expect(vm.syncMessage).toContain("Échec");
  });
});
