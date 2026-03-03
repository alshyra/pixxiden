<template>
  <div ref="containerRef" class="pixx-viewport" :style="{ height: viewportHeight }">
    <div class="pixx-track" :style="{ transform: `translateX(${translateX}px)` }">
      <div
        v-for="(img, idx) in images"
        :key="idx"
        :class="['pixx-card', { active: activeIndex === idx }]"
        :style="
          activeIndex === idx
            ? { width: `${ACTIVE_WIDTH}px`, height: `${ACTIVE_HEIGHT}px` }
            : { width: `${CARD_WIDTH}px`, height: `${INACTIVE_HEIGHT}px` }
        "
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

/**
 * Pixxiden Carousel - Largeur fixe avec défilement interne
 * Carousel autonome pour afficher des captures d'écran de jeux
 * L'élément actif est centré et agrandi avec effet de glow
 *
 * Supporte v-model pour synchroniser l'index actif avec le parent
 * Supporte aspectRatio pour adapter les dimensions des cartes
 */

interface Props {
  images?: string[];
  /** CSS aspect-ratio string e.g. "2/3", "96/31". Defaults to "16/9" */
  aspectRatio?: string;
}

const props = withDefaults(defineProps<Props>(), {
  images: () => [],
  aspectRatio: "16/9",
});

const modelValue = defineModel<number>({ default: 0 });

const containerRef = ref<HTMLElement | null>(null);
const translateX = ref(0);

// Use model value for active index (two-way binding)
const activeIndex = modelValue;

// Parse aspect ratio to compute dimensions from a fixed height
const ratio = computed(() => {
  const [w, h] = props.aspectRatio.split("/").map(Number);
  return w / h;
});

// Heights
const INACTIVE_HEIGHT = 200;
const ACTIVE_HEIGHT = 240;
const GAP = 24;

// Widths derived from aspect ratio
const CARD_WIDTH = computed(() => Math.round(INACTIVE_HEIGHT * ratio.value));
const ACTIVE_WIDTH = computed(() => Math.round(ACTIVE_HEIGHT * ratio.value));

// Viewport height = active height + margin
const viewportHeight = computed(() => `${ACTIVE_HEIGHT + 80}px`);

// Calcul de la translation pour centrer l'élément actif
const getTranslation = (): number => {
  if (!containerRef.value) return 0;

  const containerWidth = containerRef.value.offsetWidth;
  const center = containerWidth / 2;

  // Position de l'élément actif dans le rail (avant translation)
  const activePosStart = activeIndex.value * (CARD_WIDTH.value + GAP);
  // On veut que le milieu de l'élément actif soit au centre du conteneur
  const offset = center - (activePosStart + ACTIVE_WIDTH.value / 2);

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
  max-width: 1200px;
  margin: 0 auto;
  /* height set dynamically via inline style */
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
  /* width and height set dynamically via inline style */
  transition: all 0.6s cubic-bezier(0.2, 1, 0.3, 1);
}

/* État Inactif */
.pixx-card:not(.active) {
  opacity: 0.8;
  transform: scale(0.9);
}

/* État Actif */
.pixx-card.active {
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
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
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
