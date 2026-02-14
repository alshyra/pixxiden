<template>
  <div data-testid="hero-banner" class="hero-banner relative w-full h-[60vh] overflow-hidden">
    <!-- Background Image with Blur -->
    <div class="absolute inset-0">
      <img
        v-if="heroImageSrc"
        :src="heroImageSrc"
        :alt="game?.info.title"
        class="w-full h-full object-cover scale-110 object-[center_10%]"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900"
      />
      <!-- Gradient Overlays -->
      <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
    </div>

    <!-- Content -->
    <div class="relative h-full flex items-end pb-8 px-12">
      <div class="max-w-2xl space-y-4">
        <!-- Game Title -->
        <h1
          data-testid="hero-title"
          class="text-5xl md:text-6xl font-bold text-white tracking-tight"
        >
          {{ game?.info.title || "Select a Game" }}
        </h1>

        <!-- Meta Info -->
        <div v-if="game" class="flex items-center gap-3 text-sm">
          <Badge variant="default">PC (Windows)</Badge>
          <img v-if="storeIcon" :src="storeIcon" class="w-5 h-5" :alt="game.storeData.storeId" />
          <Badge v-if="releaseYear" variant="default">{{ releaseYear }}</Badge>
          <Badge v-if="score" variant="success">{{ score }}</Badge>
        </div>

        <!-- Genres -->
        <p v-if="genres" class="text-white/60 text-lg">
          {{ genres }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Game } from "@/types";
import { Badge } from "@/components/ui";
import { convertFileSrc } from "@tauri-apps/api/core";

const props = defineProps<{
  game: Game | null;
}>();

const emit = defineEmits<{
  openDetails: [];
}>();

const heroImageSrc = computed(() => {
  if (!props.game) return "";
  // Use local heroPath
  if (props.game.assets.heroPath) {
    try {
      return convertFileSrc(props.game.assets.heroPath);
    } catch {
      return "";
    }
  }
  return "";
});

const releaseYear = computed(() => {
  if (!props.game?.info.releaseDate) return null;
  return new Date(props.game.info.releaseDate).getFullYear();
});

const score = computed(() => {
  if (!props.game) return null;
  return props.game.info.metacriticScore || Math.round(props.game.info.igdbRating || 0) || null;
});

const genres = computed(() => {
  if (props.game?.info.genres?.length) {
    return props.game.info.genres.slice(0, 3).join(" | ");
  }
  return null;
});

const storeIcon = computed(() => {
  const icons: Record<string, string> = {
    epic: "/icons/epic.svg",
    gog: "/icons/gog.svg",
    amazon: "/icons/amazon.svg",
    steam: "/icons/steam.svg",
  };
  return props.game?.storeData.storeId ? icons[props.game.storeData.storeId] : null;
});
</script>
