<template>
  <span :class="[
    'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide transition-all',
    variantClasses
  ]">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Badge component for labels, store indicators, and status tags
 * 
 * @example
 * <Badge variant="steam" label="STEAM" />
 * <Badge variant="installed">✓ INSTALLÉ</Badge>
 */

const props = withDefaults(
  defineProps<{
    /** Badge style variant */
    variant?: 'steam' | 'epic' | 'gog' | 'amazon' | 'installed' | 'success' | 'error' | 'default' | 'muted'
    /** Optional text label */
    label?: string
  }>(),
  {
    variant: 'default',
  }
)

const variantClasses = computed(() => ({
  steam: 'bg-[#1b2838] text-[#66c0f4] shadow-[0_0_10px_rgba(102,192,244,0.3)]',
  epic: 'bg-[#2a2a2a] text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]',
  gog: 'bg-[#722ed1] text-white shadow-[0_0_10px_rgba(114,46,209,0.4)]',
  amazon: 'bg-[#ff9900] text-black font-extrabold shadow-[0_0_10px_rgba(255,153,0,0.4)]',
  installed: 'bg-remix-success/20 border border-remix-success/50 text-remix-success shadow-[0_0_10px_rgba(16,185,129,0.3)]',
  success: 'bg-remix-success/20 border border-remix-success/50 text-remix-success',
  error: 'bg-remix-error/20 border border-remix-error/50 text-remix-error',
  muted: 'bg-white/5 text-white/50 border border-white/10',
  default: 'bg-white/10 text-white/80 border border-white/20',
}[props.variant]))
</script>
