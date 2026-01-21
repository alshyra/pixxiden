<template>
  <span 
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variantClasses
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'success' | 'primary' | 'outline'
}>(), {
  variant: 'default'
})

const variantClasses = computed(() => ({
  default: 'bg-white/10 text-white/80',
  success: 'bg-green-500/20 text-green-400',
  primary: 'bg-indigo-500/20 text-indigo-400',
  outline: 'border border-white/20 text-white/60'
}[props.variant]))
</script>
