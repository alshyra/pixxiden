<template>
  <div ref="containerRef" class="pixx-viewport">
    <div class="pixx-track" :style="{ transform: `translateX(${translateX}px)` }">
      <div
        v-for="(img, idx) in images"
        :key="idx"
        :class="['pixx-card', { active: activeIndex === idx }]"
        @click="activeIndex = idx"
      >
        <div class="pixx-card-inner">
          <img :src="img" :alt="`Screenshot ${idx + 1}`" />
          <div class="pixx-overlay" />
        </div>
        <div v-if="activeIndex === idx" class="pixx-glow-bar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

/**
 * Pixxiden Carousel - Largeur fixe avec défilement interne
 * Carousel autonome pour afficher des captures d'écran de jeux
 * L'élément actif est centré et agrandi avec effet de glow
 *
 * Supporte v-model pour synchroniser l'index actif avec le parent
 */

interface Props {
  images?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  images: () => [],
});

const modelValue = defineModel<number>({ default: 0 });

const containerRef = ref<HTMLElement | null>(null);
const translateX = ref(0);

// Use model value for active index (two-way binding)
const activeIndex = modelValue;

// Dimensions pour le calcul du décalage
const CARD_WIDTH = 240;
const ACTIVE_WIDTH = 360;
const GAP = 24;

// Calcul de la translation pour centrer l'élément actif
const getTranslation = (): number => {
  if (!containerRef.value) return 0;

  const containerWidth = containerRef.value.offsetWidth;
  const center = containerWidth / 2;

  // Position de l'élément actif dans le rail (avant translation)
  const activePosStart = activeIndex.value * (CARD_WIDTH + GAP);
  // On veut que le milieu de l'élément actif soit au centre du conteneur
  const offset = center - (activePosStart + ACTIVE_WIDTH / 2);

  return offset;
};

const updateTranslation = () => {
  translateX.value = getTranslation();
};

// Recalculer la position quand l'index actif change
watch(activeIndex, updateTranslation);

// Gérer le redimensionnement de la fenêtre
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateTranslation();

  // Observer les changements de taille du conteneur
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateTranslation);
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
/* Le conteneur fixe qui masque le débordement */
.pixx-viewport {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  height: 300px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
}

/* Le rail qui bouge */
.pixx-track {
  display: flex;
  align-items: center;
  gap: 24px;
  transition: transform 0.7s cubic-bezier(0.2, 1, 0.3, 1);
  will-change: transform;
  padding-left: 0;
}

.pixx-card {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  width: 240px;
  height: 150px;
  transition: all 0.6s cubic-bezier(0.2, 1, 0.3, 1);
}

/* État Inactif */
.pixx-card:not(.active) {
  opacity: 0.4;
  transform: scale(0.9);
}

/* État Actif - Hauteur 200px */
.pixx-card.active {
  width: 360px;
  height: 200px;
  opacity: 1;
  z-index: 10;
}

.pixx-card-inner {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #151517;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.active .pixx-card-inner {
  border-color: #5e5ce6;
  box-shadow: 0 0 30px rgba(94, 92, 230, 0.2);
}

.pixx-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.pixx-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
}

.pixx-glow-bar {
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: #5e5ce6;
  border-radius: 4px;
  box-shadow: 0 0 15px #5e5ce6;
}
</style>
