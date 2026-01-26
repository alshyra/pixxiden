<template>
  <button :class="[
    'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-remix-accent/50 focus:ring-offset-2 focus:ring-offset-remix-black disabled:opacity-60 disabled:cursor-not-allowed',
    iconOnly ? iconSizeClasses : ['gap-2', sizeClasses, 'rounded-[14px]'],
    variantClasses.base,
    !disabled && !loading && variantClasses.hover,
    loading && 'pointer-events-none'
  ]" :disabled="disabled || loading" v-bind="$attrs">
    <!-- Loading Spinner -->
    <svg v-if="loading" class="animate-spin" :class="sizeIconClasses" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
      </path>
    </svg>

    <!-- Icon Slot -->
    <slot v-else name="icon" />

    <!-- Content (hidden if icon-only) -->
    <slot v-if="!iconOnly" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Button component with multiple variants and sizes
 * 
 * @example
 * <Button variant="primary" size="lg" :loading="saving" @click="save">
 *   <template #icon><CheckIcon /></template>
 *   SAUVEGARDER
 * </Button>
 * 
 * @example Icon-only button
 * <Button variant="ghost" icon-only @click="close">
 *   <template #icon><XIcon /></template>
 * </Button>
 */

const props = withDefaults(
  defineProps<{
    /** Button style variant */
    variant?: 'primary' | 'success' | 'danger' | 'ghost' | 'outline'
    /** Button size */
    size?: 'sm' | 'md' | 'lg'
    /** Show loading spinner */
    loading?: boolean
    /** Disable the button */
    disabled?: boolean
    /** Icon-only mode (circular button) */
    iconOnly?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    iconOnly: false,
  }
)

const variantStyles = {
  primary: {
    base: 'bg-remix-accent text-white shadow-glow',
    hover: 'hover:bg-remix-accent-hover hover:shadow-glow-strong hover:-translate-y-0.5',
  },
  success: {
    base: 'bg-green-500 text-white shadow-[0_10px_30px_rgba(34,197,94,0.3)]',
    hover: 'hover:bg-green-600 hover:shadow-[0_15px_40px_rgba(34,197,94,0.4)] hover:-translate-y-0.5',
  },
  danger: {
    base: 'bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)]',
    hover: 'hover:bg-red-600 hover:shadow-[0_15px_40px_rgba(239,68,68,0.4)] hover:-translate-y-0.5',
  },
  ghost: {
    base: 'bg-transparent text-white/70',
    hover: 'hover:bg-white/5 hover:text-white',
  },
  outline: {
    base: 'bg-transparent border border-white/10 text-white',
    hover: 'hover:border-remix-accent/50 hover:shadow-glow-subtle',
  },
}

const sizeStyles = {
  sm: { classes: 'px-3 py-2 text-xs', icon: 'w-3.5 h-3.5', iconOnly: 'w-8 h-8 rounded-full' },
  md: { classes: 'px-5 py-3 text-sm', icon: 'w-4 h-4', iconOnly: 'w-10 h-10 rounded-full' },
  lg: { classes: 'px-6 py-4 text-base', icon: 'w-5 h-5', iconOnly: 'w-12 h-12 rounded-full' },
}

const sizeClasses = computed(() => sizeStyles[props.size].classes)
const sizeIconClasses = computed(() => sizeStyles[props.size].icon)
const iconSizeClasses = computed(() => sizeStyles[props.size].iconOnly)
const variantClasses = computed(() => variantStyles[props.variant])
</script>
