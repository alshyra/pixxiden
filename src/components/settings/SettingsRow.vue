<template>
    <div class="flex items-center justify-between py-5" :class="{ 'border-b border-white/8': divider }">
        <div class="flex-1">
            <h3 class="text-[0.95rem] font-bold text-white mb-1">{{ title }}</h3>
            <p class="text-[0.8rem] text-white/50">{{ description }}</p>
        </div>
        <slot />
    </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    title: string
    description: string
    divider?: boolean
}>(), {
    divider: true
})
</script>
