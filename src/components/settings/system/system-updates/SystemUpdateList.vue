<template>
  <div class="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
    <div
      v-for="(categoryPackages, category) in groupedUpdates"
      :key="category"
      class="border-b border-white/5 last:border-b-0"
    >
      <button
        @click="$emit('toggle-category', category)"
        class="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div class="flex items-center gap-3">
          <slot name="icon" :category="category" />
          <span class="text-sm font-medium text-white">{{ getCategoryLabel(category) }}</span>
          <span class="text-xs text-white/40">({{ categoryPackages.length }})</span>
        </div>
        <slot name="chevron" :expanded="expandedCategories.has(category)" />
      </button>
      <div v-if="expandedCategories.has(category)" class="px-4 pb-3 space-y-2">
        <div
          v-for="pkg in categoryPackages"
          :key="pkg.name"
          class="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm text-white">{{ pkg.name }}</span>
            <span
              v-if="pkg.critical"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/20 text-red-400"
            >
              critique
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-white/40">{{ pkg.currentVersion }}</span>
            <slot name="arrow" />
            <span class="text-[#5e5ce6]">{{ pkg.newVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { UpdatePackage } from "@/services/api";
import { computed } from "vue";

defineProps<{
  groupedUpdates: Record<string, UpdatePackage[]>;
  expandedCategories: Set<string>;
}>();

defineEmits<["toggle-category", string]>();

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    system: "Système",
    graphics: "Graphiques",
    audio: "Audio",
    gaming: "Gaming",
    application: "Applications",
    library: "Bibliothèques",
  };
  return labels[category] || category;
}
</script>
