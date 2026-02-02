<template>
  <div
    class="group relative aspect-[2/3] overflow-hidden rounded-xl border-2 border-transparent bg-[#1a1a1c] bg-cover bg-center transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) cursor-pointer hover:scale-105 hover:border-remix-accent hover:shadow-[0_0_30px_rgba(94,92,230,0.4)] hover:z-10 focus:scale-105 focus:border-remix-accent focus:shadow-[0_0_30px_rgba(94,92,230,0.4)] focus:z-10"
    :class="{
      'selected': selected,
      'border-remix-accent shadow-[0_0_40px_rgba(94,92,230,0.6)]': selected,
    }" :style="cardStyle" :data-id="game.id">
    <!-- Placeholder background when no image -->
    <div v-if="!game.backgroundUrl && !game.coverUrl"
      class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black to-[#0a0a0a]">
      <PixxidenLogo :size="80" :glow="false" />
      <div class="absolute w-[150px] h-[150px] bg-remix-accent blur-[70px] opacity-20"></div>
    </div>

    <!-- Gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none"></div>

    <!-- Store badge -->
    <div
      class="absolute top-3 right-3 z-20 px-2 py-1 rounded-md text-[10px] font-black tracking-widest backdrop-blur-lg"
      :class="storeBadgeClasses">
      {{ storeBadgeText }}
    </div>

    <!-- Installed indicator -->
    <div v-if="game.installed"
      class="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-md text-[10px] font-bold text-green-500 backdrop-blur-lg">
      <Check class="w-3 h-3" />
      <span>Installé</span>
    </div>

    <!-- Playing indicator -->
    <div v-if="playing"
      class="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-remix-accent/30 border border-remix-accent/60 rounded-md text-[10px] font-bold text-remix-accent backdrop-blur-lg">
      <div class="w-2 h-2 bg-remix-accent rounded-full animate-game-pulse"></div>
      <span>En cours</span>
    </div>

    <!-- Title -->
    <div class="absolute bottom-4 left-4 right-4 text-sm font-black italic uppercase text-white z-20 line-clamp-2"
      style="text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);">
      {{ game.title }}
    </div>

    <!-- Focus ring glow -->
    <div v-if="focused"
      class="absolute -inset-0.5 rounded-xl bg-transparent shadow-[0_0_20px_rgba(94,92,230,0.4),inset_0_0_20px_rgba(94,92,230,0.1)] pointer-events-none z-30">
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Game } from "@/types";
import { PixxidenLogo } from "@/components/ui";
import { Check } from "lucide-vue-next";

interface Props {
  game: Game;
  focused?: boolean;
  selected?: boolean;
  playing?: boolean;
}

const props = defineProps<Props>();

// Use backgroundUrl or coverUrl for the card background
const cardStyle = computed(() => {
  const imageUrl = props.game.backgroundUrl || props.game.coverUrl;
  if (imageUrl) {
    return {
      backgroundImage: `url(${imageUrl})`,
    };
  }
  return {};
});

// Store badge text
const storeBadgeText = computed(() => {
  const store = props.game.store?.toLowerCase();
  switch (store) {
    case "steam":
      return "STEAM";
    case "epic":
      return "EPIC";
    case "gog":
      return "GOG";
    case "amazon":
      return "PRIME";
    default:
      return store?.toUpperCase() || "N/A";
  }
});

// Store badge Tailwind classes
const storeBadgeClasses = computed(() => {
  const store = props.game.store?.toLowerCase();
  switch (store) {
    case "steam":
      return "bg-[rgba(27,40,56,0.9)] text-[#66c0f4] border border-[rgba(102,192,244,0.3)]";
    case "epic":
      return "bg-[rgba(42,42,42,0.9)] text-white border border-[rgba(255,255,255,0.2)]";
    case "gog":
      return "bg-[rgba(114,46,209,0.9)] text-white border border-[rgba(139,92,246,0.3)]";
    case "amazon":
    case "prime":
      return "bg-[rgba(255,153,0,0.9)] text-black border border-[rgba(255,153,0,0.5)]";
    default:
      return "bg-[rgba(42,42,42,0.9)] text-white border border-[rgba(255,255,255,0.2)]";
  }
});
</script>

<style scoped>
/* Pulse animation for playing badge */
@keyframes game-pulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.animate-game-pulse {
  animation: game-pulse 1.5s ease-in-out infinite;
}
</style>
