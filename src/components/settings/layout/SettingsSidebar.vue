<template>
  <aside
    class="w-[280px] flex-shrink-0 bg-[#0f0f12]/98 backdrop-blur-[40px] p-6 flex flex-col"
    :class="{ 'ring-2 ring-[#5e5ce6]': focused }"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 mb-8 px-2">
      <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
        <PixxidenLogo :size="40" :glow="true" />
      </div>
      <span class="text-xl font-bold italic text-white">Pixxiden</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 flex flex-col gap-8">
      <div class="text-[0.7rem] font-bold text-white/40 tracking-[0.15em] mb-3 px-2">
        CONFIGURATION
      </div>

      <SettingsNavItem
        v-for="(section) in sections"
        :key="section.id"
        :section="section"
      />
    </nav>

    <!-- Version Badge -->
    <div class="p-4 border border-white/10 rounded-xl text-center mb-4">
      <div class="text-[0.65rem] font-bold text-white/40 tracking-[0.15em] mb-1">VERSION</div>
      <div class="text-sm font-bold text-[#5e5ce6]">{{ version }}</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PixxidenLogo } from "@/components/ui";
import SettingsNavItem from "./SettingsNavItem.vue";

export interface SettingsSection {
  id: string;
  label: string;
  icon?: string;
}

const sections: SettingsSection[] = [
  { id: "/settings/system", label: "Système" },
  { id: "/settings/store", label: "Comptes" },
  { id: "/settings/api-keys", label: "Clés API" },
  { id: "/settings/advanced", label: "Avancé" },
];

defineProps<{
  focused: boolean;
  focusedIndex: number;
  version: string;
}>();

defineEmits<{
  select: [sectionId: string];
}>();
</script>
