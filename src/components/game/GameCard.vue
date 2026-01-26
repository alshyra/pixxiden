<template>
  <div
    class="game-card"
    :class="{
      focused: focused,
      selected: selected,
    }"
    :style="cardStyle"
    :data-id="game.id"
  >
    <!-- Placeholder background when no image -->
    <div v-if="!game.backgroundUrl && !game.backgroundUrl" class="placeholder-bg">
      <PixxidenLogo :size="80" :glow="false" />
      <div class="glow-effect"></div>
    </div>

    <!-- Gradient overlay -->
    <div class="card-overlay"></div>

    <!-- Store badge -->
    <div class="store-badge" :class="`store-${game.store}`">
      {{ storeBadgeText }}
    </div>

    <!-- Installed indicator -->
    <div v-if="game.installed" class="installed-badge">
      <Check class="w-3 h-3" />
      <span>Installé</span>
    </div>

    <!-- Playing indicator -->
    <div v-if="playing" class="playing-badge">
      <div class="playing-pulse"></div>
      <span>En cours</span>
    </div>

    <!-- Title -->
    <div class="card-title">
      {{ game.title }}
    </div>

    <!-- Focus ring glow -->
    <div v-if="focused" class="focus-glow"></div>
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
</script>

<style scoped>
.game-card {
  aspect-ratio: 2/3;
  background-color: #1a1a1c;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  border: 2px solid transparent;
  cursor: pointer;
  transform-origin: center center;
}

.game-card:hover,
.game-card.focused {
  transform: scale(1.05);
  border-color: #5e5ce6;
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.4);
  z-index: 10;
}

.game-card.selected {
  border-color: #5e5ce6;
  box-shadow: 0 0 40px rgba(94, 92, 230, 0.6);
}

/* Placeholder background */
.placeholder-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #000 0%, #0a0a0a 100%);
}

.glow-effect {
  position: absolute;
  width: 150px;
  height: 150px;
  background: #5e5ce6;
  filter: blur(70px);
  opacity: 0.2;
  z-index: 0;
}

/* Gradient overlay */
.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.5) 30%,
    transparent 60%
  );
  pointer-events: none;
}

/* Store badge */
.store-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  z-index: 2;
  backdrop-filter: blur(8px);
}

.store-steam {
  background: rgba(27, 40, 56, 0.9);
  color: #66c0f4;
  border: 1px solid rgba(102, 192, 244, 0.3);
}

.store-epic {
  background: rgba(42, 42, 42, 0.9);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.store-gog {
  background: rgba(114, 46, 209, 0.9);
  color: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.store-amazon,
.store-prime {
  background: rgba(255, 153, 0, 0.9);
  color: #000000;
  border: 1px solid rgba(255, 153, 0, 0.5);
}

/* Installed badge */
.installed-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.5);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #10b981;
  z-index: 2;
  backdrop-filter: blur(8px);
}

/* Playing badge */
.playing-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(94, 92, 230, 0.3);
  border: 1px solid rgba(94, 92, 230, 0.6);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #5e5ce6;
  z-index: 2;
  backdrop-filter: blur(8px);
}

.playing-pulse {
  width: 8px;
  height: 8px;
  background: #5e5ce6;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
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

/* Title */
.card-title {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  font-size: 14px;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  color: white;
  z-index: 2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Focus glow effect */
.focus-glow {
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: transparent;
  box-shadow:
    0 0 20px rgba(94, 92, 230, 0.4),
    inset 0 0 20px rgba(94, 92, 230, 0.1);
  pointer-events: none;
  z-index: 3;
}
</style>
