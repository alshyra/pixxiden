import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsAdvanced from "@/components/settings/advanced/SettingsAdvanced.vue";

const mockGetSettings = vi.fn();
const mockInfo = vi.fn();
const mockLogError = vi.fn();
const mockOnGamepad = vi.fn();

vi.mock("@/services/api", () => ({
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: (...args: unknown[]) => mockInfo(...args),
  error: (...args: unknown[]) => mockLogError(...args),
}));

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({ on: (...args: unknown[]) => mockOnGamepad(...args) }),
}));

describe("SettingsAdvanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      protonVersion: "ge-proton-8-31",
      mangoHudEnabled: true,
    });
  });

  it("loads settings on mount", async () => {
    const wrapper = mount(SettingsAdvanced, {
      global: {
        stubs: {
          AlertTriangle: true,
          Select: {
            props: ["modelValue"],
            template: "<button class='select-stub'>{{ modelValue }}</button>",
          },
          Toggle: {
            props: ["modelValue"],
            template: "<button class='toggle-stub'>{{ modelValue }}</button>",
          },
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetSettings).toHaveBeenCalled();
    expect(wrapper.text()).toContain("ge-proton-8-31");
    expect(wrapper.text()).toContain("true");
  });

  it("handles settings load failure", async () => {
    mockGetSettings.mockRejectedValueOnce(new Error("load failed"));

    mount(SettingsAdvanced, {
      global: {
        stubs: {
          AlertTriangle: true,
          Select: true,
          Toggle: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockLogError).toHaveBeenCalled();
  });
});
