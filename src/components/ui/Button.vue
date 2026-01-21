<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
      sizeClasses,
      variantClasses,
      { 'opacity-50 cursor-not-allowed': disabled }
    ]"
    :disabled="disabled"
  >
    <slot name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost' | 'success'
  disabled?: boolean
}>(), {
  size: 'md',
  variant: 'primary',
  disabled: false
})

const sizeClasses = computed(() => ({
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl'
}[props.size]))

const variantClasses = computed(() => ({
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  secondary: 'bg-white/10 hover:bg-white/20 text-white focus:ring-white/30',
  ghost: 'bg-transparent hover:bg-white/10 text-white focus:ring-white/20',
  success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
}[props.variant]))
</script>
