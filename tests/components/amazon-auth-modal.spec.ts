import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AmazonAuthModal from "@/components/settings/store/AmazonAuthModal.vue";

const mockLoginAmazon = vi.fn();
const mockLoginAmazonWith2FA = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    loginAmazon: (...args: unknown[]) => mockLoginAmazon(...args),
    loginAmazonWith2FA: (...args: unknown[]) => mockLoginAmazonWith2FA(...args),
  }),
}));

describe("AmazonAuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginAmazon.mockResolvedValue(undefined);
    mockLoginAmazonWith2FA.mockResolvedValue(undefined);
  });

  it("submits login form and emits success", async () => {
    const wrapper = mount(AmazonAuthModal, {
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

    const email = wrapper.get('input[placeholder="votre@email.com"]');
    const password = wrapper.get('input[placeholder="••••••••••"]');
    await email.setValue("user@test.com");
    await password.setValue("pwd");

    const btn = wrapper.findAll("button").find((b) => b.text().includes("Se connecter"));
    expect(btn).toBeTruthy();
    await btn!.trigger("click");

    expect(mockLoginAmazon).toHaveBeenCalledWith("user@test.com", "pwd");
    expect(wrapper.emitted("success")).toBeTruthy();
  });
});
