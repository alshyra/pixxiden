<template>
  <div 
    class="pixxiden-logo-container"
    :style="containerStyle"
  >
    <!-- Effet de Halo/Glow en arrière-plan -->
    <div 
      v-if="glow" 
      class="absolute inset-0 bg-[#5e5ce6] blur-[30px] opacity-20 animate-pulse"
    ></div>

    <!-- Logo SVG -->
    <svg 
      viewBox="0 0 100 100" 
      class="pixxiden-svg w-full h-full drop-shadow-[0_0_8px_rgba(94,92,230,0.4)]"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      
      <!-- Hexagone avec animation de tracé -->
      <path 
        d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
        fill="none" 
        stroke="url(#logo-grad)" 
        stroke-width="4"
        class="animate-dash"
        stroke-dasharray="320"
        stroke-dashoffset="320"
      />
      
      <!-- Texte PX - Ajusté pour un meilleur centrage optique -->
      <text 
        x="48" 
        y="52" 
        text-anchor="middle" 
        dominant-baseline="middle"
        font-size="28" 
        font-weight="900" 
        fill="white" 
        style="font-family: monospace; letter-spacing: -0.05em; user-select: none;"
      >
        PX
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

interface Props {
  size?: number | string
  glow?: boolean
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 100,
  glow: true,
  isLoading: false,
})

// Type the computed style as CSSProperties so literal values like 'relative' match the expected unions
const containerStyle = computed<CSSProperties>(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : (props.size as string),
  height: typeof props.size === 'number' ? `${props.size}px` : (props.size as string),
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))
</script>

<style scoped>
@keyframes dash {
  0% { 
    stroke-dashoffset: 320; 
  }
  50% { 
    stroke-dashoffset: 0; 
  }
  100% { 
    stroke-dashoffset: -320; 
  }
}

.animate-dash {
  animation: dash 4s ease-in-out infinite;
}

.pixxiden-svg {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 10;
  position: relative;
}

.pixxiden-svg:hover {
  transform: scale(1.05);
}

.pixxiden-logo-container {
  user-select: none;
}
</style>
