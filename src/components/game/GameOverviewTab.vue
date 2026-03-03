<template>
  <div class="h-full grid grid-cols-2 gap-4 overflow-hidden">
    <p class="text-[#a0a0b0] text-[15px] leading-6 line-clamp-4">
      {{ game?.info.description || "Aucune description disponible." }}
    </p>

    <div class="grid grid-cols-2 gap-2 h-fit">
      <div class="stat-card" v-if="game?.gameCompletion.playTimeMinutes">
        <p class="stat-label">Temps de jeu</p>
        <p class="stat-value">{{ game?.gameCompletion.playTimeMinutes }}</p>
      </div>
            <div class="stat-card" v-if="game?.gameCompletion.timeToBeatCompletely">
        <p class="stat-label">Temps pour tout finir</p>
        <p class="stat-value">{{ game?.gameCompletion.timeToBeatCompletely }} h</p>
      </div>
      <div class="stat-card" v-if="formattedTimetoBeat !== 'N/A'">
        <p class="stat-label">Time to beat</p>
        <p class="stat-value">{{ formattedTimetoBeat }}</p>
      </div>
      <div class="stat-card" v-if="game?.gameCompletion.achievementsTotal">
        <p class="stat-label">Succès</p>
        <p class="stat-value">{{ achievements }}</p>
      </div>
      <div class="stat-card" v-if="game?.info.releaseDate">
        <p class="stat-label">Date de sortie</p>
        <p class="stat-value">{{ formattedDate }}</p>
      </div>

      <div class="stat-card" v-if="diskSize !== 'N/A'">
        <p class="stat-label">Taille</p>
        <p class="stat-value">{{ diskSize }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrentGame } from "@/composables/useCurrentGame";

const { game, formattedTimetoBeat } = useCurrentGame();

const achievements = computed(() => {
  const unlocked = game.value?.gameCompletion.achievementsUnlocked ?? 0;
  const total = game.value?.gameCompletion.achievementsTotal ?? 0;
  return `${unlocked} / ${total}`;
});

const diskSize = computed(() => {
  const size = (game.value?.installation as Record<string, unknown> | undefined)?.diskSize;
  if (typeof size === "string" && size.length > 0) {
    return size;
  }
  return game.value?.installation.installSize || "N/A";
});

const formattedDate = computed(() => {
  if (!game.value?.info.releaseDate) return "N/A";
  const date = new Date(game.value.info.releaseDate);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});
</script>

<style scoped>
.stat-card {
  background: #17171c;
  border-radius: 8px;
  padding: 10px 14px;
}

.stat-label {
  color: #a0a0b0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-value {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}
</style>
