<template>
  <div
    data-testid="library-layout"
    class="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]"
  >
    <GameHeroSection class="absolute inset-0" />

    <RouterView v-slot="{ Component, route }">
      <Transition
        name="panel"
        mode="out-in"
      >
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>

    <Transition name="fade">
      <div
        v-if="loading"
        data-testid="library-loading"
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm"
      >
        <div class="w-12 h-12 border-4 border-white/20 border-t-[#5e5ce6] rounded-full animate-spin mb-4" />
        <p class="text-white/60 text-sm font-medium">Chargement de votre bibliothèque...</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useLibraryStore } from "@/stores/library";
import GameHeroSection from "@/components/game/GameHeroSection.vue";

const libraryStore = useLibraryStore();
const { loading } = storeToRefs(libraryStore);

onMounted(async () => {
  if (libraryStore.games.length === 0) {
    await libraryStore.fetchGames();
  }
});
</script>

<style scoped>
/* Fade simple (loading overlay) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Panel : pas de fade à l'entrée (les animations enfants gèrent le reveal) */
.panel-enter-active {
}
.panel-leave-active {
  transition: opacity 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}
.panel-enter-from {
}
.panel-leave-to {
  opacity: 0;
}

/* Animations de sortie pour les enfants de LibraryContent */
/* Utilise :deep() pour traverser le composant enfant */
:deep(.panel-leave-active .filters-enter) {
  animation: slide-to-top 0.22s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

:deep(.panel-leave-active .carousel-enter) {
  animation: slide-to-bottom 0.22s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes slide-to-top {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

@keyframes slide-to-bottom {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}
</style>
