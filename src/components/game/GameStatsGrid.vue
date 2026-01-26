<template>
  <div class="grid grid-cols-4 gap-4">
    <StatCard label="Taille" :value="game?.installSize" color="cyan" />
    <StatCard label="Durée" :value="gameDuration" color="pink" />
    <StatCard label="Note" :color="scoreColor">
      {{ scoreDisplay }}
    </StatCard>
    <StatCard label="ProtonDB" :color="protonColor">
      {{ game?.protonTier || "--" }}
    </StatCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { StatCard } from "@/components/ui";
import { useCurrentGame } from "@/composables/useCurrentGame";

/**
 * GameStatsGrid - Smart Component autonome
 * Grille de stats du jeu (taille, durée HLTB, note, ProtonDB)
 * Récupère toutes ses données via useCurrentGame
 */

const { game, score, gameDuration } = useCurrentGame();

const scoreDisplay = computed(() => (score.value ? `${score.value}/100` : "--"));

const scoreColor = computed(() => {
  if (!score.value) return "gray";
  if (score.value >= 75) return "green";
  if (score.value >= 50) return "yellow";
  return "red";
});

const protonColor = computed(() => {
  const colors: Record<string, "cyan" | "yellow" | "gray" | "red" | "green"> = {
    native: "cyan",
    platinum: "cyan",
    gold: "yellow",
    silver: "gray",
    bronze: "yellow",
    pending: "gray",
    borked: "red",
  };
  return colors[game.value?.protonTier || ""] || "gray";
});
</script>
