<template>
  <Button
    :variant="variant"
    size="lg"
    class="!p-6 !rounded-xl flex-col !gap-3 h-auto"
    @click="$emit('click')"
  >
    <template #icon>
      <slot name="icon" />
    </template>
    <span class="font-semibold">{{ title }}</span>
    <span v-if="subtitle" class="text-xs opacity-70">{{ subtitle }}</span>
  </Button>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui";

defineProps<{
  title: string;
  subtitle?: string;
  variant?: "primary" | "success" | "danger" | "ghost" | "outline";
}>();

defineEmits<{
  click: [];
}>();
</script>
