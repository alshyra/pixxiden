<template>
  <div
    class="bg-[#0f0f12] border border-white/5 p-4 rounded-xl flex flex-col"
    :class="{ 'items-center text-center': centered }"
  >
    <span class="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">
      {{ label }}
    </span>
    <div class="text-xl font-black italic mt-0.5" :class="valueColorClass">
      <slot>{{ value || "--" }}</slot>
    </div>
    <span v-if="subtitle" class="text-[8px] text-gray-500 mt-1">
      {{ subtitle }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * StatCard for displaying key metrics
 *
 * @example
 * <StatCard label="Durée" value="12h" color="pink" />
 * <StatCard label="Note" color="green">
 *   <span>85/100</span>
 * </StatCard>
 */

const props = withDefaults(
  defineProps<{
    label: string;
    value?: string | number;
    subtitle?: string;
    color?: "white" | "cyan" | "pink" | "green" | "yellow" | "red" | "gray";
    centered?: boolean;
  }>(),
  {
    color: "white",
    centered: false,
  },
);

const valueColorClass = computed(() => {
  const colors: Record<string, string> = {
    white: "text-white",
    cyan: "text-cyan-400",
    pink: "text-pink-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    gray: "text-gray-400",
  };
  return colors[props.color];
});
</script>
