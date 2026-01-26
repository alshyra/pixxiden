<template>
  <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
    <div class="flex items-start gap-3">
      <slot name="icon" />
      <div class="flex-1">
        <h4 class="text-red-400 font-medium mb-1">Redémarrage requis</h4>
        <p class="text-red-200/70 text-sm mb-3">
          Des mises à jour critiques ont été installées. Un redémarrage est recommandé pour les
          appliquer.
        </p>
        <div class="flex gap-3">
          <slot name="reboot-btn" />
          <slot name="later-btn" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
// Pure slot component
</script>
