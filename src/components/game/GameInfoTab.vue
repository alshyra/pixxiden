<template>
  <div class="h-full overflow-hidden">
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="item in infoItems"
        :key="item.label"
      >
        <p class="info-label">{{ item.label }}</p>
        <p class="info-value">{{ item.value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrentGame } from "@/composables/useCurrentGame";

const { game } = useCurrentGame();

const releaseDate = computed(() => {
  const value = game.value?.info.releaseDate;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

const infoItems = computed(() => {
  const items = [
    { label: "Studio", value: game.value?.info.developer || "" },
    { label: "Éditeur", value: game.value?.info.publisher || "" },
    { label: "Date de sortie", value: releaseDate.value },
    { label: "Cloud Saves", value: game.value?.installation.cloudSaveSupport || "" },
    { label: "Plateforme installée", value: game.value?.installation.installedPlatform || "" },
  ];

  return items.filter((item) => item.value);
});
</script>

<style scoped>
.info-label {
  color: #a0a0b0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.info-value {
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
}
</style>
