import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Input from "@/components/ui/Input.vue";
import Toggle from "@/components/ui/Toggle.vue";

describe("UI primitives", () => {
  it("renders Badge with variant and slot content", () => {
    const wrapper = mount(Badge, {
      props: { variant: "steam", label: "STEAM" },
      slots: { default: "STORE" },
    });

    expect(wrapper.text()).toContain("STORE");
    expect(wrapper.classes().join(" ")).toContain("inline-flex");
  });

  it("renders Button default and loading states", () => {
    const wrapper = mount(Button, {
      props: { variant: "primary", size: "md" },
      slots: { default: "Click me" },
    });

    expect(wrapper.text()).toContain("Click me");

    const loadingWrapper = mount(Button, {
      props: { loading: true, size: "sm" },
      slots: { default: "Loading" },
    });

    expect(loadingWrapper.find("svg.animate-spin").exists()).toBe(true);
    expect((loadingWrapper.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders Card with title/label/header/footer slots", () => {
    const wrapper = mount(Card, {
      props: {
        variant: "glass",
        title: "Titre",
        label: "LABEL",
      },
      slots: {
        default: "Contenu",
        footer: "Pied",
      },
    });

    expect(wrapper.text()).toContain("Titre");
    expect(wrapper.text()).toContain("LABEL");
    expect(wrapper.text()).toContain("Contenu");
    expect(wrapper.text()).toContain("Pied");
  });

  it("renders Input and emits update:modelValue", async () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: "abc",
        label: "API key",
        hint: "hint",
      },
    });

    const input = wrapper.get("input");
    await input.setValue("new-value");

    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeTruthy();
    expect(events?.[0]).toEqual(["new-value"]);
    expect(wrapper.text()).toContain("API key");
  });

  it("shows Input error state", () => {
    const wrapper = mount(Input, {
      props: {
        modelValue: "",
        error: "Champ requis",
      },
    });

    expect(wrapper.text()).toContain("Champ requis");
  });

  it("renders Toggle and emits update on click", async () => {
    const wrapper = mount(Toggle, {
      props: {
        modelValue: false,
        label: "Enable",
      },
    });

    const switchButton = wrapper.get("button");
    await switchButton.trigger("click");

    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeTruthy();
    expect(events?.[0]).toEqual([true]);
  });

  it("renders disabled Toggle", () => {
    const wrapper = mount(Toggle, {
      props: {
        modelValue: true,
        disabled: true,
      },
    });

    const switchButton = wrapper.get("button");
    expect(switchButton.attributes("aria-label")).toBe("Toggle");
    expect(switchButton.classes().join(" ")).toContain("opacity-50");
  });
});
