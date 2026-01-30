import { Cpu, Monitor, Volume2, Gamepad2, Box, Library } from "lucide-vue-next";
import type { Component } from "vue";

export function getCategoryIcon(category: string): Component {
  const icons: Record<string, Component> = {
    system: Cpu,
    graphics: Monitor,
    audio: Volume2,
    gaming: Gamepad2,
    application: Box,
    library: Library,
  };
  return icons[category] || Box;
}
