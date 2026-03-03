<template>
  <div class="relative z-0 w-full h-full overflow-hidden bg-[#0a0a0a]">
    <div class="absolute inset-0 transition-opacity duration-1000">
      <img
        v-if="heroImage"
        :src="heroImage"
        :alt="game?.info.title"
        class="w-full h-full object-cover object-center"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-black"
      />
    </div>

    <div
      class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-[#0d0d0f]"
    />

    <div class="absolute bottom-8 left-10 z-10 max-w-[70vw]">
      <h1 class="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
        {{ game?.info.title || "N/A" }}
      </h1>
      <p class="text-[#a0a0b0] text-sm mt-2">
        {{ game?.info.developer || "N/A" }} · {{ releaseYear || "N/A" }} · {{ game?.info.genres?.join(", ") || "N/A" }}
      </p>

      <div class="mt-3 flex items-center gap-2 flex-wrap">
        <span class="badge text-yellow-200 bg-yellow-800">{{ protonBadge }}</span>
        <span class="badge text-blue-200 bg-blue-800">{{ storeBadge }}</span>
        <span class="badge text-green-200 bg-green-800" v-if="game?.info.metacriticScore">Meta: {{ game?.info.metacriticScore }} %</span>
        <span class="badge text-amber-200 bg-amber-800" v-if="game?.info.igdbRating">IGDB: {{ game?.info.igdbRating }} %</span>
      </div>
    </div>

    <div
      class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none text-center z-10"
    >
      <div class="flex gap-4 mt-2 opacity-30">
        <div class="w-12 h-[1px] bg-[#5e5ce6] shadow-[0_0_8px_#5e5ce6]" />
        <div class="w-12 h-[1px] bg-[#5e5ce6] shadow-[0_0_8px_#5e5ce6]" />
      </div>
    </div>

    <!-- Optional slot for overlay content -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrentGame } from "@/composables/useCurrentGame";

/**
 * GameHeroSection - Smart Component autonome
 * Section hero avec image de fond pour les pages détail de jeu
 * Récupère l'image hero via useCurrentGame
 */

const { game, heroImage } = useCurrentGame();

const releaseYear = computed(() => {
  if (!game.value?.info.releaseDate) return "";
  const year = new Date(game.value.info.releaseDate).getFullYear();
  return Number.isNaN(year) ? "" : String(year);
});

const protonBadge = computed(() => {
  const tier = game.value?.protonData.protonTier;
  if (!tier || tier === "pending") return "ProtonDB Pending";
  return `ProtonDB ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
});

const storeBadge = computed(() => {
  const store = game.value?.storeData.store;
  if (!store) return "Store";
  const labels: Record<string, string> = {
    epic: "Epic Games",
    gog: "GOG",
    amazon: "Amazon Games",
    steam: "Steam",
  };
  return labels[store] || store;
});
</script>

<style scoped>
.badge {
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 700;
}
</style>
