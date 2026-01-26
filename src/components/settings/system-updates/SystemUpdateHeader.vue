<template>
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-bold text-white">Mises à jour système</h3>
      <p class="text-sm text-gray-500">
        {{ statusText }}
      </p>
    </div>
    <slot name="badge" />
  </div>
</template>
<script setup lang="ts">
defineProps<{ statusText: string }>();
</script>
