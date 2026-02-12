import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GOGAuthModal from "@/components/settings/store/GOGAuthModal.vue";

const mockOpenUrl = vi.fn();
const mockLoginGOG = vi.fn();
const mockGetGOGAuthUrl = vi.fn();

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: (...args: unknown[]) => mockOpenUrl(...args),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    loginGOG: (...args: unknown[]) => mockLoginGOG(...args),
    getGOGAuthUrl: (...args: unknown[]) => mockGetGOGAuthUrl(...args),
  }),
}));

describe("GOGAuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGOGAuthUrl.mockReturnValue("https://gog-auth");
    mockOpenUrl.mockResolvedValue(undefined);
    mockLoginGOG.mockResolvedValue(undefined);
  });

  it("opens GOG auth URL on show", async () => {
    const wrapper = mount(GOGAuthModal, {
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

    expect(mockOpenUrl).toHaveBeenCalledWith("https://gog-auth");
  });
});
