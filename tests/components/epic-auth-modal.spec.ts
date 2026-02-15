import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EpicAuthModal from "@/components/settings/store/EpicAuthModal.vue";

const mockOpen = vi.fn();
const mockFetchAuthStatus = vi.fn();
const mockFetchGames = vi.fn();
const mockStartEpicAuth = vi.fn();
const mockCompleteEpicAuth = vi.fn();

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ fetchAuthStatus: (...args: unknown[]) => mockFetchAuthStatus(...args) }),
}));

vi.mock("@/stores/library", () => ({
  useLibraryStore: () => ({ fetchGames: (...args: unknown[]) => mockFetchGames(...args) }),
}));

vi.mock("@/services", () => ({
  getAuthService: () => ({
    startEpicAuth: (...args: unknown[]) => mockStartEpicAuth(...args),
    completeEpicAuth: (...args: unknown[]) => mockCompleteEpicAuth(...args),
  }),
}));

describe("EpicAuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartEpicAuth.mockResolvedValue("https://epic-auth");
    mockOpen.mockResolvedValue(undefined);
    mockCompleteEpicAuth.mockResolvedValue(undefined);
    mockFetchAuthStatus.mockResolvedValue(undefined);
    mockFetchGames.mockResolvedValue(undefined);
  });

  it("opens browser with auth URL", async () => {
    const wrapper = mount(EpicAuthModal, {
      props: { show: false },
      global: {
        stubs: {
          Transition: false,
          Modal: { template: "<div><slot /><slot name='footer' /></div>" },
        },
      },
    });

    await wrapper.setProps({ show: true });
    await Promise.resolve();
    await Promise.resolve();

    const btn = wrapper.findAll("button").find((b) => b.text().includes("Ouvrir le navigateur"));
    expect(btn).toBeTruthy();
    await btn!.trigger("click");

    expect(mockOpen).toHaveBeenCalledWith("https://epic-auth");
  });

  it("submits code and emits success", async () => {
    const wrapper = mount(EpicAuthModal, {
      props: { show: false },
      global: {
        stubs: {
          Transition: false,
          Modal: { template: "<div><slot /><slot name='footer' /></div>" },
        },
      },
    });

    await wrapper.setProps({ show: true });
    await Promise.resolve();
    await Promise.resolve();

    const input = wrapper.get('input[placeholder="Collez le code ici..."]');
    await input.setValue("abc-code");

    const validate = wrapper.findAll("button").find((b) => b.text().includes("Valider"));
    expect(validate).toBeTruthy();
    await validate!.trigger("click");

    expect(mockCompleteEpicAuth).toHaveBeenCalledWith("abc-code");
    expect(mockFetchAuthStatus).toHaveBeenCalled();
    expect(mockFetchGames).toHaveBeenCalled();
    expect(wrapper.emitted("success")).toBeTruthy();
  });
});
