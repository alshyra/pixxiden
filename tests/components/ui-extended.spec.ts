import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import ProgressBar from "@/components/ui/ProgressBar.vue";
import Select from "@/components/ui/Select.vue";
import StatCard from "@/components/ui/StatCard.vue";
import PixxidenLogo from "@/components/ui/PixxidenLogo.vue";

describe("UI extended coverage", () => {
  it("renders ProgressBar with percent and speed", () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 50,
        max: 100,
        label: "Progression",
        showValue: true,
        showSpeed: true,
        speed: "2 MB/s",
        variant: "success",
      },
    });

    expect(wrapper.text()).toContain("Progression");
    expect(wrapper.text()).toContain("50%");
    expect(wrapper.text()).toContain("2 MB/s");
  });

  it("renders Select with placeholder and selected value", async () => {
    const wrapper = mount(Select, {
      props: {
        modelValue: null,
        options: [
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ],
        placeholder: "Choisir...",
      },
    });

    expect(wrapper.text()).toContain("Choisir");

    await wrapper.setProps({ modelValue: "b" });
    expect(wrapper.text()).toContain("Option B");
  });

  it("renders StatCard with value and subtitle", () => {
    const wrapper = mount(StatCard, {
      props: {
        label: "FPS",
        value: "120",
        subtitle: "moyenne",
        color: "green",
        centered: true,
      },
    });

    expect(wrapper.text()).toContain("FPS");
    expect(wrapper.text()).toContain("120");
    expect(wrapper.text()).toContain("moyenne");
  });

  it("renders PixxidenLogo with computed size style", () => {
    const wrapper = mount(PixxidenLogo, {
      props: {
        size: 64,
        glow: true,
        isLoading: false,
      },
    });

    const style = wrapper.attributes("style");
    expect(style).toContain("width: 64px");
    expect(style).toContain("height: 64px");
    expect(wrapper.find("svg").exists()).toBe(true);
  });
});
