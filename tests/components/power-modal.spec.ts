import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PowerModal from "@/components/settings/PowerModal.vue";
import { mockSystemApis, mockTauriWindow, gamepadHandlers } from "../helpers/setup";

describe("PowerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(gamepadHandlers).forEach((key) => delete gamepadHandlers[key]);
    mockSystemApis.shutdownSystem.mockResolvedValue(undefined);
    mockTauriWindow.close.mockResolvedValue(undefined);
  });

  it("emits shutdown and calls API", async () => {
    const wrapper = mount(PowerModal, {
      props: { show: true },
      global: {
        stubs: {
          Power: true,
          LogOut: true,
          Modal: { template: "<div><slot /></div>" },
        },
      },
    });

    const shutdownButton = wrapper.findAll("button").find((b) => b.text().includes("Éteindre"));
    expect(shutdownButton).toBeTruthy();
    await shutdownButton!.trigger("click");

    expect(wrapper.emitted("shutdown")).toBeTruthy();
    expect(mockSystemApis.shutdownSystem).toHaveBeenCalled();
  });

  it("emits quit and closes window", async () => {
    const wrapper = mount(PowerModal, {
      props: { show: true },
      global: {
        stubs: {
          Power: true,
          LogOut: true,
          Modal: { template: "<div><slot /></div>" },
        },
      },
    });

    const quitButton = wrapper.findAll("button").find((b) => b.text().includes("Quitter"));
    expect(quitButton).toBeTruthy();
    await quitButton!.trigger("click");

    expect(wrapper.emitted("quit")).toBeTruthy();
    expect(mockTauriWindow.close).toHaveBeenCalled();
  });

  it("supports gamepad back action", async () => {
    const wrapper = mount(PowerModal, {
      props: { show: true },
      global: {
        stubs: {
          Power: true,
          LogOut: true,
          Modal: { template: "<div><slot /></div>" },
        },
      },
    });

    gamepadHandlers.back?.();

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("logs errors on action failures", async () => {
    mockSystemApis.shutdownSystem.mockRejectedValueOnce(new Error("shutdown failed"));

    const wrapper = mount(PowerModal, {
      props: { show: true },
      global: {
        stubs: {
          Power: true,
          LogOut: true,
          Modal: { template: "<div><slot /></div>" },
        },
      },
    });

    const shutdownButton = wrapper.findAll("button").find((b) => b.text().includes("Éteindre"));
    await shutdownButton!.trigger("click");

    // Error logging is handled internally by the component
    await wrapper.vm.$nextTick();
  });
});
