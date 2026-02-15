import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SetupWizard from "@/components/ui/SetupWizard.vue";

const mockSkipSetup = vi.fn();
const mockSaveApiKeys = vi.fn();
const mockTestApiKeys = vi.fn();
const mockLogError = vi.fn();

vi.mock("@/services/api", () => ({
  skipSetup: (...args: unknown[]) => mockSkipSetup(...args),
  saveApiKeys: (...args: unknown[]) => mockSaveApiKeys(...args),
  testApiKeys: (...args: unknown[]) => mockTestApiKeys(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  error: (...args: unknown[]) => mockLogError(...args),
}));

function mountWizard() {
  return mount(SetupWizard, {
    global: {
      stubs: {
        Transition: false,
        PixxidenLogo: true,
      },
    },
  });
}

async function clickButtonByText(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  const button = wrapper.findAll("button").find((b) => b.text().includes(text));
  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }
  await button.trigger("click");
}

describe("SetupWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSkipSetup.mockResolvedValue(undefined);
    mockSaveApiKeys.mockResolvedValue(undefined);
    mockTestApiKeys.mockResolvedValue({
      steamgriddbValid: true,
      steamgriddbMessage: "ok sgdb",
      igdbValid: true,
      igdbMessage: "ok igdb",
      steamValid: true,
      steamMessage: "ok steam",
    });
  });

  it("emits skip when user skips setup", async () => {
    const wrapper = mountWizard();

    await wrapper.get("button").trigger("click");

    expect(mockSkipSetup).toHaveBeenCalled();
    expect(wrapper.emitted("skip")).toBeTruthy();
  });

  it("navigates steps forward and backward", async () => {
    const wrapper = mountWizard();

    await clickButtonByText(wrapper, "Configurer les clés API");
    expect(wrapper.text()).toContain("SteamGridDB");

    await clickButtonByText(wrapper, "← Retour");
    expect(wrapper.text()).toContain("Bienvenue sur Pixxiden");
  });

  it("tests API keys and displays messages", async () => {
    const wrapper = mountWizard();

    await clickButtonByText(wrapper, "Configurer les clés API");

    const steamGridInput = wrapper.get('input[placeholder="Votre clé API SteamGridDB..."]');
    await steamGridInput.setValue("sgdb-key");

    await clickButtonByText(wrapper, "Tester");

    expect(mockTestApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({ steamgriddbApiKey: "sgdb-key" }),
    );
    expect(wrapper.text()).toContain("ok sgdb");
  });

  it("logs test error when testCurrentStep fails", async () => {
    mockTestApiKeys.mockRejectedValueOnce(new Error("test failed"));
    const wrapper = mountWizard();

    await clickButtonByText(wrapper, "Configurer les clés API");
    await clickButtonByText(wrapper, "Tester");

    expect(mockLogError).toHaveBeenCalled();
  });
});
