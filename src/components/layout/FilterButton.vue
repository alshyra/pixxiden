<template>
  <button 
    class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all"
    :class="active ? 'text-white' : 'text-white/50 hover:text-white/80'"
  >
    <!-- Icon -->
    <span class="text-xl">
      <component :is="iconComponent" class="w-5 h-5" />
    </span>
    
    <!-- Label -->
    <span class="text-xs font-medium tracking-wide">{{ label }}</span>
    
    <!-- Active indicator -->
    <div 
      class="h-0.5 w-8 rounded-full transition-all"
      :class="active ? 'bg-white' : 'bg-transparent'"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Gamepad2, Download, Clock, Calendar, History, Library } from 'lucide-vue-next'

const props = defineProps<{
  icon: string
  label: string
  active?: boolean
}>()

const iconComponent = computed(() => {
  const iconMap: Record<string, typeof Gamepad2> = {
    games: Library,
    controller: Gamepad2,
    download: Download,
    clock: Clock,
    calendar: Calendar,
    history: History
  }
  return iconMap[props.icon] || Library
})
</script>
