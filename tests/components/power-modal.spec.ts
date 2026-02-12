import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PowerModal from "@/components/settings/PowerModal.vue";

const mockShutdownSystem = vi.fn();
const mockClose = vi.fn();
const mockLogError = vi.fn();
let gamepadHandlers: Record<string, (...args: any[]) => void> = {};

vi.mock("@/services/api", () => ({
  shutdownSystem: (...args: unknown[]) => mockShutdownSystem(...args),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ close: (...args: unknown[]) => mockClose(...args) }),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  error: (...args: unknown[]) => mockLogError(...args),
}));

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({
    on: (event: string, handler: (...args: any[]) => void) => {
      gamepadHandlers[event] = handler;
    },
  }),
}));

describe("PowerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gamepadHandlers = {};
    mockShutdownSystem.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
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
    expect(mockShutdownSystem).toHaveBeenCalled();
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
    expect(mockClose).toHaveBeenCalled();
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
    mockShutdownSystem.mockRejectedValueOnce(new Error("shutdown failed"));

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

    expect(mockLogError).toHaveBeenCalled();
  });
});
