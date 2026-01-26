<template>
  <div class="progress-bar">
    <!-- Label row -->
    <div v-if="label || showValue" class="flex justify-between items-end mb-2">
      <span
        v-if="label"
        class="text-[9px] font-black uppercase tracking-widest"
        :class="labelColorClass"
      >
        {{ label }}
      </span>
      <span v-if="showValue" class="text-[10px] font-bold text-white">
        {{ displayValue }}
      </span>
    </div>

    <!-- Progress track -->
    <div
      class="w-full bg-white/5 rounded-full overflow-hidden"
      :class="[
        size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3',
        bordered && 'p-[1px] border border-white/5',
      ]"
    >
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="[barColorClass, glow && 'shadow-[0_0_15px_currentColor]']"
        :style="{ width: `${clampedValue}%` }"
      />
    </div>

    <!-- Subtitle row -->
    <div v-if="$slots.subtitle || (showSpeed && speed)" class="flex justify-between mt-1.5">
      <slot name="subtitle">
        <span
          v-if="showSpeed && speed"
          class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter"
        >
          {{ speed }}
        </span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * ProgressBar component for downloads, achievements, etc.
 *
 * @example
 * <ProgressBar
 *   :value="downloadProgress"
 *   label="Téléchargement"
 *   variant="accent"
 *   :glow="true"
 *   show-value
 * />
 */

const props = withDefaults(
  defineProps<{
    value: number;
    max?: number;
    label?: string;
    variant?: "accent" | "success" | "warning" | "error" | "gradient";
    size?: "sm" | "md" | "lg";
    showValue?: boolean;
    showSpeed?: boolean;
    speed?: string;
    glow?: boolean;
    bordered?: boolean;
    valueFormat?: "percent" | "fraction";
  }>(),
  {
    max: 100,
    variant: "accent",
    size: "md",
    showValue: false,
    showSpeed: false,
    glow: false,
    bordered: false,
    valueFormat: "percent",
  },
);

const clampedValue = computed(() => Math.min(Math.max((props.value / props.max) * 100, 0), 100));

const displayValue = computed(() => {
  if (props.valueFormat === "fraction") {
    return `${props.value}/${props.max}`;
  }
  return `${Math.floor(clampedValue.value)}%`;
});

const labelColorClass = computed(() => {
  const colors: Record<string, string> = {
    accent: "text-[#5e5ce6]",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
    gradient: "text-[#5e5ce6]",
  };
  return colors[props.variant];
});

const barColorClass = computed(() => {
  const colors: Record<string, string> = {
    accent: "bg-[#5e5ce6]",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    gradient: "bg-gradient-to-r from-[#5e5ce6] to-[#a78bfa]",
  };
  return colors[props.variant];
});
</script>
