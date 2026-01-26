<template>
  <div
    class="rounded-2xl overflow-hidden transition-all duration-300"
    :class="[variantClasses, hoverable && 'hover:border-white/20 hover:shadow-lg cursor-pointer']"
  >
    <!-- Header -->
    <div v-if="$slots.header || title" class="px-6 py-4 border-b border-white/5">
      <slot name="header">
        <div class="flex items-center justify-between">
          <div>
            <span
              v-if="label"
              class="text-[10px] font-black uppercase tracking-widest text-[#5e5ce6]"
            >
              {{ label }}
            </span>
            <h3 v-if="title" class="text-lg font-bold text-white" :class="{ 'mt-1': label }">
              {{ title }}
            </h3>
          </div>
          <slot name="header-action" />
        </div>
      </slot>
    </div>

    <!-- Content -->
    <div :class="noPadding ? '' : 'p-6'">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-white/5 bg-white/2">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Card component for content containers
 *
 * @example
 * <Card label="Système" title="Informations" variant="elevated">
 *   <template #header-action>
 *     <Button size="sm">Rafraîchir</Button>
 *   </template>
 *   Content here...
 * </Card>
 */

const props = withDefaults(
  defineProps<{
    variant?: "default" | "elevated" | "outlined" | "glass";
    title?: string;
    label?: string;
    hoverable?: boolean;
    noPadding?: boolean;
  }>(),
  {
    variant: "default",
    hoverable: false,
    noPadding: false,
  },
);

const variantClasses = computed(() => {
  const styles: Record<string, string> = {
    default: "bg-[#0f0f12] border border-white/5",
    elevated: "bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/5 shadow-2xl",
    outlined: "bg-transparent border border-white/10",
    glass: "bg-white/5 backdrop-blur-xl border border-white/10",
  };
  return styles[props.variant];
});
</script>
