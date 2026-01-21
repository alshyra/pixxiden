<template>
  <button 
    :class="[
      'flex items-center justify-center rounded-full transition-all duration-200',
      'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
      sizeClasses,
      variantClasses
    ]"
    :title="title"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'solid'
  title?: string
}>(), {
  size: 'md',
  variant: 'ghost'
})

const sizeClasses = computed(() => ({
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg'
}[props.size]))

const variantClasses = computed(() => ({
  ghost: 'bg-transparent',
  solid: 'bg-white/10'
}[props.variant]))
</script>
