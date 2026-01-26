<template>
  <Listbox v-model="selected" :disabled="disabled">
    <div class="relative">
      <ListboxButton
        class="relative w-full appearance-none bg-black/60 border border-white/10 rounded-[10px] px-4 pr-10 py-3 text-sm font-semibold text-white cursor-pointer hover:border-remix-accent/50 focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all text-left"
      >
        <span v-if="selectedOption" class="block truncate">{{ selectedOption.label }}</span>
        <span v-else class="block truncate text-white/50">{{ placeholder }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown class="w-4 h-4 text-white/50 transition-transform ui-open:rotate-180" />
        </span>
      </ListboxButton>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <ListboxOptions
          class="absolute z-50 mt-2 w-full overflow-auto rounded-xl bg-remix-bg-card border border-white/10 shadow-glow-strong max-h-60 py-2 text-sm focus:outline-none"
        >
          <ListboxOption
            v-for="option in options"
            :key="option.value"
            v-slot="{ active, selected }"
            :value="option.value"
            as="template"
          >
            <li
              :class="[
                active ? 'bg-remix-accent text-white' : 'text-white/90',
                'relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors',
              ]"
            >
              <span :class="[selected ? 'font-bold' : 'font-medium', 'block truncate']">
                {{ option.label }}
              </span>
              <span
                v-if="selected"
                class="absolute inset-y-0 left-0 flex items-center pl-3 text-white"
              >
                <Check class="w-5 h-5" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/vue";
import { ChevronDown, Check } from "lucide-vue-next";

/**
 * Custom Select component using Headless UI Listbox
 *
 * @example
 * <Select
 *   v-model="protonVersion"
 *   :options="[{ value: 'v1', label: 'Version 1' }]"
 *   placeholder="Select version"
 * />
 */

export interface SelectOption {
  value: string | number;
  label: string;
}

const props = withDefaults(
  defineProps<{
    /** Current selected value */
    modelValue: string | number | null;
    /** Array of options to display */
    options: SelectOption[];
    /** Placeholder text when no value selected */
    placeholder?: string;
    /** Disable the select */
    disabled?: boolean;
  }>(),
  {
    placeholder: "Sélectionner...",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
}>();

const selected = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value !== null) {
      emit("update:modelValue", value);
    }
  },
});

const selectedOption = computed(() => {
  return props.options.find((option) => option.value === props.modelValue);
});
</script>
