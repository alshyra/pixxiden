<template>
  <nav class="absolute bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-black to-transparent">
    <div class="flex items-center justify-center gap-8">
      <FilterButton 
        v-for="filter in filters"
        :key="filter.id"
        :active="modelValue === filter.id"
        :icon="filter.icon"
        :label="filter.label"
        @click="$emit('update:modelValue', filter.id)"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import FilterButton from './FilterButton.vue'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const filters = [
  { id: 'all', label: 'all games', icon: 'games' },
  { id: 'controller', label: 'controller enabled', icon: 'controller' },
  { id: 'installed', label: 'installed', icon: 'download' },
  { id: 'most-played', label: 'most played', icon: 'clock' },
  { id: 'recently-added', label: 'recently added', icon: 'calendar' },
  { id: 'recent', label: 'recent games', icon: 'history' }
]
</script>
