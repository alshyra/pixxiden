<template>
    <Card variant="glass" class="!p-6">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                    {{ title }}
                    <Badge v-if="valid !== null" :variant="valid ? 'success' : 'error'">
                        {{ valid ? '✓ Valide' : '✗ Invalide' }}
                    </Badge>
                </h3>
                <p class="text-xs text-white/50 mt-1">{{ description }}</p>
            </div>
            <a v-if="helpUrl" :href="helpUrl" target="_blank"
                class="text-xs text-[#5e5ce6] hover:text-[#7e7cff] transition-colors">
                {{ helpText }}
            </a>
        </div>
        <slot />
    </Card>
</template>

<script setup lang="ts">
import { Card, Badge } from '@/components/ui'

defineProps<{
    title: string
    description: string
    helpUrl?: string
    helpText?: string
    valid?: boolean | null
}>()
</script>
