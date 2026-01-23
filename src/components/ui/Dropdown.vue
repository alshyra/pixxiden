<template>
  <Menu as="div" class="relative inline-block text-left">
    <!-- Trigger Button -->
    <MenuButton
      class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-remix-accent/50 transition-all"
    >
      <slot name="trigger">
        <!-- Default: 3 dots icon -->
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </slot>
    </MenuButton>

    <!-- Menu Items -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <MenuItems
        :class="[
          'absolute z-50 mt-2 w-56 origin-top-right rounded-xl bg-remix-bg-card border border-white/10 shadow-glow-strong py-2 focus:outline-none',
          align === 'right' ? 'right-0' : 'left-0'
        ]"
      >
        <MenuItem
          v-for="(item, index) in items"
          :key="index"
          v-slot="{ active }"
          :disabled="item.disabled"
        >
          <button
            @click="item.action"
            :class="[
              'group flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
              item.danger 
                ? active 
                  ? 'bg-remix-error/15 text-remix-error' 
                  : 'text-remix-error/80'
                : active 
                  ? 'bg-remix-accent text-white' 
                  : 'text-white/90',
              item.disabled && 'opacity-50 cursor-not-allowed'
            ]"
            :disabled="item.disabled"
          >
            <!-- Icon Component (if provided) -->
            <component 
              v-if="item.icon" 
              :is="item.icon" 
              class="w-5 h-5 flex-shrink-0" 
            />
            
            <!-- Icon String (emoji/text) -->
            <span v-else-if="item.iconString" class="text-base">
              {{ item.iconString }}
            </span>
            
            <!-- Label -->
            <span>{{ item.label }}</span>
          </button>
        </MenuItem>
        
        <!-- Divider between items -->
        <div 
          v-if="hasDividers"
          class="my-1 h-px bg-white/10"
        />
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

/**
 * Dropdown menu component using Headless UI Menu
 * 
 * @example
 * <Dropdown :items="gameActions" align="right">
 *   <template #trigger>
 *     <span>Options</span>
 *   </template>
 * </Dropdown>
 */

export interface DropdownItem {
  label: string
  action: () => void
  icon?: Component
  iconString?: string
  danger?: boolean
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    /** Array of dropdown items */
    items: DropdownItem[]
    /** Alignment of dropdown menu */
    align?: 'left' | 'right'
    /** Show dividers between items */
    hasDividers?: boolean
  }>(),
  {
    align: 'left',
    hasDividers: false,
  }
)
</script>
