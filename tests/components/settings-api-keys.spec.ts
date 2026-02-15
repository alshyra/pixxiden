import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsApiKeys from "@/components/settings/advanced/SettingsApiKeys.vue";

const mockOnGamepad = vi.fn();
const mockGetApiKeys = vi.fn();
const mockSaveApiKeys = vi.fn();
const mockTestApiKeys = vi.fn();

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({ on: (...args: unknown[]) => mockOnGamepad(...args) }),
}));

vi.mock("@/services/api", () => ({
  getApiKeys: (...args: unknown[]) => mockGetApiKeys(...args),
  saveApiKeys: (...args: unknown[]) => mockSaveApiKeys(...args),
  testApiKeys: (...args: unknown[]) => mockTestApiKeys(...args),
}));

describe("SettingsApiKeys component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiKeys.mockResolvedValue({
      steamgriddbApiKey: "sgdb",
      igdbClientId: "igdb-id",
      igdbClientSecret: "igdb-secret",
      steamApiKey: "steam-key",
      steamId: "76561198000000000",
    });
    mockSaveApiKeys.mockResolvedValue(undefined);
    mockTestApiKeys.mockResolvedValue({
      steamgriddbValid: true,
      igdbValid: true,
      steamValid: false,
    });
  });

  it("loads API keys on mount", async () => {
    const wrapper = mount(SettingsApiKeys, {
      global: {
        stubs: {
          Info: true,
          CheckCircle: true,
          Check: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetApiKeys).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Clés API");
  });

  it("tests api keys when clicking test button", async () => {
    const wrapper = mount(SettingsApiKeys, {
      global: {
        stubs: {
          Info: true,
          CheckCircle: true,
          Check: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const testButton = wrapper.findAll("button").find((b) => b.text().includes("TESTER LES CLÉS"));
    expect(testButton).toBeTruthy();

    await testButton!.trigger("click");

    expect(mockTestApiKeys).toHaveBeenCalled();
  });

  it("saves api keys when clicking save button", async () => {
    const wrapper = mount(SettingsApiKeys, {
      global: {
        stubs: {
          Info: true,
          CheckCircle: true,
          Check: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const saveButton = wrapper.findAll("button").find((b) => b.text().includes("SAUVEGARDER"));
    expect(saveButton).toBeTruthy();

    await saveButton!.trigger("click");

    expect(mockSaveApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        steamgriddbApiKey: "sgdb",
        igdbClientId: "igdb-id",
      }),
    );
  });
});
