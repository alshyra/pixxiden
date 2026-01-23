<template>
  <div class="relative">
    <select 
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="w-full appearance-none bg-black/60 border border-white/10 rounded-[10px] px-4 pr-10 py-3 text-sm font-semibold text-white cursor-pointer hover:border-remix-accent/50 focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all"
    >
      <slot />
    </select>
    
    <!-- Chevron Icon -->
    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg class="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>