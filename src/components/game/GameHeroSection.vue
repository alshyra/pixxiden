<template>
    <div class="relative h-[45vh] w-full overflow-hidden shrink-0 bg-[#0a0a0a]">
        <!-- Background Image -->
        <div class="absolute inset-0 bg-cover bg-center opacity-50 transition-opacity duration-1000">
            <img v-if="heroImage" :src="heroImage" :alt="game?.title" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-black" />
        </div>

        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/40 to-[#050505]" />

        <!-- Decorative Lines -->
        <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none text-center z-10">
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
import { useCurrentGame } from '@/composables/useCurrentGame'

/**
 * GameHeroSection - Smart Component autonome
 * Section hero avec image de fond pour les pages détail de jeu
 * Récupère l'image hero via useCurrentGame
 */

const { game, heroImage } = useCurrentGame()
</script>
