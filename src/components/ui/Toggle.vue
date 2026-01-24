<template>
  <Switch 
    v-model="checked"
    :disabled="disabled"
    :class="[
      'relative inline-flex h-7 w-[52px] items-center rounded-full border-0 cursor-pointer transition-all duration-300',
      checked ? 'bg-remix-accent shadow-glow' : 'bg-white/10',
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    ]"
    :aria-label="label || 'Toggle'"
  >
    <span
      :class="[
        'inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300',
        checked ? 'translate-x-6' : 'translate-x-0.5'
      ]"
    />
  </Switch>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from '@headlessui/vue'

/**
 * Toggle/Switch component using Headless UI Switch
 * 
 * @example
 * <Toggle 
 *   v-model="mangoHudEnabled"
 *   label="Overlay MangoHud"
 * />
 */

const props = withDefaults(
  defineProps<{
    /** Current toggle state */
    modelValue: boolean
    /** Accessible label for the toggle */
    label?: string
    /** Optional description text */
    description?: string
    /** Disable the toggle */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>
