import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SystemUpdates from "@/components/settings/system/system-updates/SystemUpdates.vue";

const mockIsSudoersConfigured = vi.fn();
const mockCheckSystemUpdates = vi.fn();
const mockRequiresSystemReboot = vi.fn();
const mockInstallSystemUpdates = vi.fn();
const mockRebootSystem = vi.fn();
const mockListen = vi.fn();

vi.mock("@/services/api", () => ({
  isSudoersConfigured: (...args: unknown[]) => mockIsSudoersConfigured(...args),
  checkSystemUpdates: (...args: unknown[]) => mockCheckSystemUpdates(...args),
  requiresSystemReboot: (...args: unknown[]) => mockRequiresSystemReboot(...args),
  installSystemUpdates: (...args: unknown[]) => mockInstallSystemUpdates(...args),
  rebootSystem: (...args: unknown[]) => mockRebootSystem(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

describe("SystemUpdates (vm methods)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSudoersConfigured.mockResolvedValue({ configured: false });
    mockCheckSystemUpdates.mockResolvedValue({ packages: [], totalSize: 0, requiresReboot: false });
    mockRequiresSystemReboot.mockResolvedValue(false);
    mockInstallSystemUpdates.mockResolvedValue({ requiresReboot: true });
    mockRebootSystem.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(vi.fn());
  });

  it("exposes helper methods", async () => {
    const wrapper = mount(SystemUpdates, {
      global: { stubs: { SudoersConfigModal: true } },
    });

    await Promise.resolve();
    const vm = wrapper.vm as any;

    expect(vm.formatBytes(0)).toBe("0 B");
    expect(vm.formatBytes(1024)).toContain("KB");
    expect(vm.getCategoryLabel("gaming")).toBe("Gaming");
    expect(vm.getCategoryLabel("unknown")).toBe("unknown");
  });

  it("toggles categories", async () => {
    const wrapper = mount(SystemUpdates, {
      global: { stubs: { SudoersConfigModal: true } },
    });

    await Promise.resolve();
    const vm = wrapper.vm as any;

    const initialHasSystem = vm.expandedCategories.has("system");
    vm.toggleCategory("system");
    expect(vm.expandedCategories.has("system")).toBe(!initialHasSystem);
    vm.toggleCategory("system");
    expect(vm.expandedCategories.has("system")).toBe(initialHasSystem);
  });

  it("checkUpdates updates state when configured", async () => {
    const wrapper = mount(SystemUpdates, {
      global: { stubs: { SudoersConfigModal: true } },
    });

    const vm = wrapper.vm as any;
    vm.sudoersConfigured = true;

    mockCheckSystemUpdates.mockResolvedValueOnce({
      packages: [
        {
          name: "mesa",
          currentVersion: "1.0",
          newVersion: "1.1",
          category: "graphics",
          size: 100,
          critical: false,
        },
      ],
      totalSize: 100,
      requiresReboot: false,
    });

    await vm.checkUpdates();

    expect(mockCheckSystemUpdates).toHaveBeenCalled();
    expect(vm.updates.length).toBe(1);
    expect(vm.totalSize).toBe(100);
  });

  it("installUpdates installs and sets reboot flag", async () => {
    const wrapper = mount(SystemUpdates, {
      global: { stubs: { SudoersConfigModal: true } },
    });

    const vm = wrapper.vm as any;
    vm.updates = [
      {
        name: "linux",
        currentVersion: "6.7",
        newVersion: "6.8",
        category: "system",
        size: 100,
        critical: true,
      },
    ];

    await vm.installUpdates();

    expect(mockInstallSystemUpdates).toHaveBeenCalled();
    expect(vm.requiresReboot).toBe(true);
    expect(vm.updates).toEqual([]);
  });

  it("reboot delegates to API", async () => {
    const wrapper = mount(SystemUpdates, {
      global: { stubs: { SudoersConfigModal: true } },
    });

    const vm = wrapper.vm as any;
    await vm.reboot();

    expect(mockRebootSystem).toHaveBeenCalled();
  });
});
