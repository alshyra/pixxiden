<template>
    <div class="input-wrapper">
        <label v-if="label" :for="inputId" class="block text-sm font-medium text-white/70 mb-2">
            {{ label }}
        </label>
        <div class="relative">
            <input :id="inputId" ref="inputRef" :type="type" :value="modelValue" :placeholder="placeholder"
                :disabled="disabled"
                class="w-full px-4 py-3 bg-[#1a1a1f] border rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors"
                :class="[
                    error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#5e5ce6]',
                    disabled && 'opacity-50 cursor-not-allowed'
                ]" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
            <slot name="suffix" />
        </div>
        <p v-if="hint && !error" class="text-xs text-white/40 mt-2">{{ hint }}</p>
        <p v-if="error" class="text-xs text-red-400 mt-2">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * Input component for forms
 * 
 * @example
 * <Input 
 *   v-model="apiKey" 
 *   label="Clé API" 
 *   type="password"
 *   placeholder="Votre clé API..."
 *   hint="Optionnel mais recommandé"
 * />
 */

const props = withDefaults(
    defineProps<{
        modelValue?: string
        label?: string
        type?: 'text' | 'password' | 'email' | 'number'
        placeholder?: string
        hint?: string
        error?: string
        disabled?: boolean
    }>(),
    {
        modelValue: '',
        type: 'text',
        disabled: false,
    }
)

defineEmits<{
    'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 9)}`)

defineExpose({
    focus: () => inputRef.value?.focus(),
    blur: () => inputRef.value?.blur(),
})
</script>
