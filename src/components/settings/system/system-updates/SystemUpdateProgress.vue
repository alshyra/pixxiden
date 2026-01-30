<template>
  <div class="p-4 bg-[#0a0a0a] border border-white/10 rounded-xl">
    <div class="flex items-center gap-3 mb-4">
      <slot name="icon" />
      <span class="text-sm text-white">{{ stageLabel }}</span>
    </div>
    <div class="space-y-2">
      <div class="flex justify-between text-xs text-white/50">
        <span>{{ progress.packageName }}</span>
        <span>{{ Math.round(progress.progress) }}%</span>
      </div>
      <slot name="progress-bar" :value="progress.progress" />
    </div>
    <p class="mt-4 text-xs text-amber-400">⚠️ Ne pas éteindre le système pendant l'installation</p>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  progress: { stage: string; packageName: string; progress: number };
}>();
const stageLabel = computed(() => {
  if (props.progress.stage === "downloading") return "Téléchargement en cours...";
  if (props.progress.stage === "installing") return "Installation en cours...";
  return "Traitement...";
});
</script>
