<template>
  <TabGroup :selected-index="selectedIndex" @change="handleTabChange">
    <!-- Tab List -->
    <TabList class="flex flex-col gap-2">
      <div class="text-[0.7rem] font-bold text-white/40 tracking-[0.15em] mb-1 px-2">
        {{ label }}
      </div>
      
      <Tab
        v-for="tab in tabs"
        :key="tab.id"
        v-slot="{ selected }"
        as="template"
      >
        <button
          class="group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left focus:outline-none focus:ring-2 focus:ring-remix-accent/50"
          :class="[
            selected 
              ? 'text-white bg-white/8' 
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          ]"
        >
          <!-- Active Indicator -->
          <span 
            class="absolute left-0 rounded-r transition-all"
            :class="[
              selected 
                ? 'w-1 h-5 bg-remix-accent shadow-glow' 
                : 'w-0 h-0'
            ]"
          ></span>
          
          <!-- Icon -->
          <span v-if="tab.icon" class="text-base">{{ tab.icon }}</span>
          
          <!-- Label -->
          <span>{{ tab.label }}</span>
        </button>
      </Tab>
    </TabList>

    <!-- Tab Panels -->
    <TabPanels class="mt-6">
      <TabPanel
        v-for="tab in tabs"
        :key="tab.id"
        class="focus:outline-none"
      >
        <transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <slot :name="tab.id" />
        </transition>
      </TabPanel>
    </TabPanels>
  </TabGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'

/**
 * Tabs component using Headless UI TabGroup
 * 
 * @example
 * <Tabs :tabs="settingsTabs" label="CONFIGURATION" v-model="activeTab">
 *   <template #systeme>
 *     <!-- Système tab content -->
 *   </template>
 *   <template #comptes>
 *     <!-- Comptes tab content -->
 *   </template>
 * </Tabs>
 */

export interface TabItem {
  id: string
  label: string
  icon?: string
}

const props = withDefaults(
  defineProps<{
    /** Array of tab items */
    tabs: TabItem[]
    /** Optional label above tabs */
    label?: string
    /** Current active tab (controlled mode) */
    modelValue?: string
  }>(),
  {
    label: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedIndex = computed(() => {
  if (!props.modelValue) return 0
  return props.tabs.findIndex(tab => tab.id === props.modelValue)
})

const handleTabChange = (index: number) => {
  emit('update:modelValue', props.tabs[index].id)
}
</script>
