<template>
  <div
    data-testid="library-view"
    class="absolute inset-0 pointer-events-none"
  >
    <div
      data-testid="game-carousel"
      class="absolute bottom-16 left-0 right-0 pointer-events-auto carousel-enter"
    >
      <GameCarousel
        ref="carouselRef"
        :games="filteredGames"
        :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id"
        @select="selectGame"
        @open="openGameDetails"
      />
    </div>

    <div class="pointer-events-auto filters-enter">
      <TopFilters v-model="currentFilter" />
    </div>

    <Transition
      enter-active-class="transition-all duration-500"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="!loading && filteredGames.length === 0"
        data-testid="library-empty"
        class="absolute inset-0 flex flex-col items-center justify-center px-4 text-center pointer-events-auto"
      >
        <div class="mb-6 opacity-50">
          <Package class="w-24 h-24 text-white/30" />
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">
          {{ currentFilter === "all" ? "Aucun jeu trouvé" : "Aucun jeu dans ce filtre" }}
        </h2>

        <p class="text-sm text-white/50 mb-8 max-w-sm">
          {{
            currentFilter === "all"
              ? "Synchronisez vos bibliothèques pour commencer à jouer"
              : "Changez de filtre pour voir vos autres jeux"
          }}
        </p>

        <Button
          v-if="currentFilter === 'all'"
          variant="primary"
          size="lg"
          :loading="syncing"
          :disabled="syncing"
          @click="openSettings"
        >
          <template #icon>
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': syncing }" />
          </template>
          {{ "Connectez vos stores." }}
        </Button>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="!loading && filteredGames.length > 0"
        data-testid="game-count"
        class="fixed bottom-20 right-4 sm:right-8 px-4 py-2 bg-black/80 border border-white/10 rounded-lg text-xs font-semibold text-white/50 backdrop-blur-md pointer-events-none"
      >
        {{ filteredGames.length }} {{ filteredGames.length === 1 ? "jeu" : "jeux" }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { onKeyStroke } from "@vueuse/core";
import { useLibraryStore } from "@/stores/library";
import { useGamepad } from "@/composables/useGamepad";
import { useSideNavStore } from "@/stores/sideNav";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { Button } from "@/components/ui";
import { RefreshCw, Package } from "lucide-vue-next";
import type { Game } from "@/types";
import GameCarousel from "@/components/game/GameCarousel.vue";
import { TopFilters } from "@/components/layout";
import { storeToRefs } from "pinia";

const router = useRouter();
const libraryStore = useLibraryStore();
const { games, loading, syncing } = storeToRefs(libraryStore);
const { on: onGamepad } = useGamepad();
const sideNavStore = useSideNavStore();

const carouselRef = ref<InstanceType<typeof GameCarousel> | null>(null);

type FilterKey = "all" | "installed" | "epic" | "gog" | "amazon" | "steam";

const currentFilter = ref<FilterKey>("all");
const selectedIndex = ref(0);
const selectedGame = ref<Game | null>(null);
const playingGame = ref<Game | null>(null);

const filteredGames = computed(() => {
  switch (currentFilter.value) {
    case "installed":
      return games.value.filter((g) => g.installation.installed);
    case "epic":
      return games.value.filter((g) => g.storeData.store === "epic");
    case "gog":
      return games.value.filter((g) => g.storeData.store === "gog");
    case "amazon":
      return games.value.filter((g) => g.storeData.store === "amazon");
    case "steam":
      return games.value.filter((g) => g.storeData.store === "steam");
    default:
      return games.value.slice().sort((a, b) => a.info.title.localeCompare(b.info.title));
  }
});

watch(
  filteredGames,
  (list) => {
    if (list.length === 0) {
      selectedGame.value = null;
      libraryStore.setFeaturedGame(null);
      selectedIndex.value = 0;
      return;
    }

    const currentGame = selectedGame.value;
    const currentStillVisible = currentGame ? list.some((g) => g.id === currentGame.id) : false;

    if (!currentStillVisible) {
      const featuredGame = libraryStore.featuredGameId
        ? list.find((g) => g.id === libraryStore.featuredGameId)
        : null;

      const gameToSelect = featuredGame || list[0];
      selectedGame.value = gameToSelect;
      libraryStore.setFeaturedGame(gameToSelect.id);
      const newIdx = list.indexOf(gameToSelect);
      selectedIndex.value = newIdx >= 0 ? newIdx : 0;
      nextTick(() => carouselRef.value?.scrollToSelected());
    } else {
      const newIdx = currentGame ? list.findIndex((g) => g.id === currentGame.id) : -1;
      if (newIdx !== -1) selectedIndex.value = newIdx;
    }
  },
  { immediate: true },
);

function navigateCarousel(direction: "left" | "right") {
  const total = filteredGames.value.length;
  if (total === 0) return;

  if (direction === "left") {
    selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : total - 1;
  } else {
    selectedIndex.value = selectedIndex.value < total - 1 ? selectedIndex.value + 1 : 0;
  }

  selectedGame.value = filteredGames.value[selectedIndex.value] || null;
  if (selectedGame.value) {
    libraryStore.setFeaturedGame(selectedGame.value.id);
  }

  nextTick(() => {
    carouselRef.value?.scrollToSelected();
  });
}

const filterOrder: FilterKey[] = ["all", "installed", "epic", "gog", "amazon", "steam"];

function navigateFilters(direction: "up" | "down") {
  const currentIdx = filterOrder.indexOf(currentFilter.value);

  if (direction === "up" && currentIdx > 0) {
    currentFilter.value = filterOrder[currentIdx - 1];
  } else if (direction === "down" && currentIdx < filterOrder.length - 1) {
    currentFilter.value = filterOrder[currentIdx + 1];
  }
}

function selectGame(game: Game) {
  selectedGame.value = game;
  libraryStore.setFeaturedGame(game.id);
  const idx = filteredGames.value.findIndex((g) => g.id === game.id);
  if (idx !== -1) {
    selectedIndex.value = idx;
  }
}

function openGameDetails(game: Game | null) {
  const gameToOpen = game || selectedGame.value;
  if (!gameToOpen) return;
  router.push({ name: "game-detail", params: { id: gameToOpen.id } });
}

function openSettings() {
  router.push("/settings");
}

onKeyStroke("ArrowLeft", () => {
  navigateCarousel("left");
});
onKeyStroke("ArrowRight", () => {
  navigateCarousel("right");
});
onKeyStroke("ArrowUp", () => {
  navigateFilters("up");
});
onKeyStroke("ArrowDown", () => {
  navigateFilters("down");
});

onKeyStroke(["q", "Q"], () => {
  switchFilter("prev");
});
onKeyStroke(["e", "E"], () => {
  switchFilter("next");
});

onKeyStroke(["s", "S"], (event: KeyboardEvent) => {
  const target = document.activeElement as HTMLElement;
  if (target?.tagName !== "INPUT" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    sideNavStore.open();
  }
});

onKeyStroke("Enter", () => {
  if (selectedGame.value) openGameDetails(selectedGame.value);
});

onKeyStroke(["a", "A"], () => {
  if (selectedGame.value) openGameDetails(selectedGame.value);
});

onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => {
  router.back();
});

function switchFilter(direction: "prev" | "next") {
  const currentIdx = filterOrder.indexOf(currentFilter.value);
  if (direction === "prev") {
    currentFilter.value =
      currentIdx > 0 ? filterOrder[currentIdx - 1] : filterOrder[filterOrder.length - 1];
  } else {
    currentFilter.value =
      currentIdx < filterOrder.length - 1 ? filterOrder[currentIdx + 1] : filterOrder[0];
  }
}

const cleanupNavigate = onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (sideNavStore.isOpen) return;
  if (direction === "left") navigateCarousel("left");
  else if (direction === "right") navigateCarousel("right");
  else if (direction === "up") navigateFilters("up");
  else if (direction === "down") navigateFilters("down");
});

const cleanupConfirm = onGamepad("confirm", () => {
  if (sideNavStore.isOpen) return;
  if (selectedGame.value) openGameDetails(selectedGame.value);
});

const cleanupOptions = onGamepad("options", () => {
  if (sideNavStore.isOpen) return;
  sideNavStore.open();
});

const cleanupLb = onGamepad("lb", () => {
  if (sideNavStore.isOpen) return;
  switchFilter("prev");
});

const cleanupRb = onGamepad("rb", () => {
  if (sideNavStore.isOpen) return;
  switchFilter("next");
});

onUnmounted(() => {
  cleanupNavigate();
  cleanupConfirm();
  cleanupOptions();
  cleanupLb();
  cleanupRb();
});
</script>

<style scoped>
/* Animations d'entrée */
.filters-enter {
  animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.carousel-enter {
  animation: slide-from-bottom 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slide-from-top {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-from-bottom {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
