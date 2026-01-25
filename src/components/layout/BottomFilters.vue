<template>
  <nav class="absolute top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
    <div class="flex items-center justify-center gap-4">
      <!-- L1 indicator (left side) -->
      <div class="filter-bumper left-bumper">
        <ControllerButton button="LB" :type="controllerType" size="sm" />
      </div>
      
      <!-- Filters -->
      <div class="flex items-center gap-6">
        <FilterButton 
          v-for="filter in filters"
          :key="filter.id"
          :active="modelValue === filter.id"
          :icon="filter.icon"
          :label="filter.label"
          @click="$emit('update:modelValue', filter.id)"
        />
      </div>
      
      <!-- R1 indicator (right side) -->
      <div class="filter-bumper right-bumper">
        <ControllerButton button="RB" :type="controllerType" size="sm" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import FilterButton from './FilterButton.vue'
import { ControllerButton } from '@/components/ui'
import { useGamepad } from '@/composables/useGamepad'
import { computed } from 'vue'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const { state: gamepadState } = useGamepad()
const controllerType = computed(() => gamepadState.value.type)

const filters = [
  { id: 'all', label: 'all games', icon: 'games' },
  { id: 'controller', label: 'controller enabled', icon: 'controller' },
  { id: 'installed', label: 'installed', icon: 'download' },
  { id: 'most-played', label: 'most played', icon: 'clock' },
  { id: 'recently-added', label: 'recently added', icon: 'calendar' },
  { id: 'recent', label: 'recent games', icon: 'history' }
]
</script>

<style scoped>
.filter-bumper {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.filter-bumper:hover {
  opacity: 1;
}

.left-bumper {
  margin-right: 1rem;
}

.right-bumper {
  margin-left: 1rem;
}
</style>
