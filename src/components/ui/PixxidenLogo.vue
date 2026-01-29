<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: {
    type: [Number, String],
    default: 128
  },
  glow: {
    type: Boolean,
    default: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

/**
 * Calcul dynamique du style du conteneur en fonction de la prop size
 */
const containerStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
}));
</script>

<template>
  <div :style="containerStyle" class="group pixxiden-wrapper">
    <!-- Effet de halo (Glow) -->
    <div 
      v-if="glow"
      class="glow-effect"
      :class="{ 'is-loading': isLoading }"
    ></div>

    <!-- Logo SVG -->
    <svg
      viewBox="0 0 100 100"
      class="logo-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Dégradé Hexagone -->
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>

        <!-- Dégradé Manette -->
        <linearGradient id="gradientController" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#60a5fa" />
          <stop offset="100%" stop-color="#a78bfa" />
        </linearGradient>
      </defs>

      <!-- Hexagone de fond -->
      <path
        d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z"
        fill="#0f172a"
        fill-opacity="0.8"
        stroke="url(#logo-grad)"
        stroke-width="4"
        stroke-linejoin="round"
        stroke-linecap="round"
        class="hexagon-path"
        :class="{ 'path-loading': isLoading }"
      />

      <!-- Groupe Manette -->
      <g 
        class="controller-root"
        :class="{ 'animation-loading': isLoading, 'animation-float': !isLoading }"
      >
        <!-- Groupe de mise à l'échelle pour le survol (Hover) -->
        <g class="controller-hover-scale">
          <g transform="scale(0.098) translate(255,255)">
            <path 
              d="M467.51,248.83c-18.4-83.18-45.69-136.24-89.43-149.17A91.5,91.5,0,0,0,352,96c-26.89,0-48.11,16-96,16s-69.15-16-96-16a99.09,99.09,0,0,0-27.2,3.66C89,112.59,61.94,165.7,43.33,248.83c-19,84.91-15.56,152,21.58,164.88,26,9,49.25-9.61,71.27-37,25-31.2,55.79-40.8,119.82-40.8s93.62,9.6,118.66,40.8c22,27.41,46.11,45.79,71.42,37.16C487.1,399.86,486.52,334.74,467.51,248.83Z" 
              fill="none" 
              stroke="url(#gradientController)" 
              stroke-miterlimit="10" 
              stroke-width="32"
            />
            
            <circle cx="292" cy="224" r="20" fill="url(#gradientController)" class="btn-dot" />
            <circle cx="336" cy="180" r="20" fill="url(#gradientController)" class="btn-dot" />
            <circle cx="336" cy="264" r="20" fill="url(#gradientController)" class="btn-dot" />
            <circle cx="380" cy="224" r="20" fill="url(#gradientController)" class="btn-dot" />

            <path d="M160,176 L160,272" stroke="url(#gradientController)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M112,224 L208,224" stroke="url(#gradientController)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Base */
.pixxiden-wrapper {
  position: relative;
}

.logo-svg {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 10;
  filter: drop-shadow(0 0 12px rgba(94, 92, 230, 0.5));
}

/* Glow Effect */
.glow-effect {
  position: absolute;
  inset: 0;
  background-color: #5e5ce6;
  filter: blur(30px);
  border-radius: 9999px;
  opacity: 0.1;
  transition: opacity 0.5s ease;
}

.glow-effect.is-loading {
  opacity: 0.2;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Hexagon Loading */
.hexagon-path {
  transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
}

.path-loading {
  stroke-dasharray: 80 240;
  stroke-dashoffset: 320;
  animation: dash 3s linear infinite;
}

/* Controller Animations */
.controller-root {
  transform-origin: 50% 50%;
  transform-box: fill-box;
}

.animation-float {
  animation: float 4s ease-in-out infinite;
}

.animation-loading {
  animation: complex-loading 1.5s ease-in-out infinite;
}

.controller-hover-scale {
  transform-origin: 50% 50%;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Hover Interaction */
.pixxiden-wrapper:hover .controller-hover-scale {
  transform: scale(1.15);
}

.btn-dot {
  transition: filter 0.3s ease;
}

.pixxiden-wrapper:hover .btn-dot {
  filter: brightness(1.25);
}

/* Keyframes */
@keyframes dash {
  from { stroke-dashoffset: 320; }
  to { stroke-dashoffset: 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.1; }
}

@keyframes complex-loading {
  0% { transform: rotate(0deg) scale(1); }
  40% { transform: rotate(360deg) scale(1); }
  50% { transform: rotate(360deg) scale(1.1); }
  70% { transform: rotate(360deg) scale(1); }
  80% { transform: rotate(360deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
</style>