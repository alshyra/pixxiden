<template>
  <div class="relative min-h-screen bg-remix-black overflow-hidden pb-20 transition-all duration-600">
    <!-- Hero Banner -->
    <HeroBanner :game="selectedGame" @open-details="openGameDetails(selectedGame)"
      class="transition-all duration-600" />

    <!-- Games Carousel -->
    <div class="absolute bottom-14 left-0 right-0">
      <GameCarousel ref="carouselRef" :games="filteredGames" :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id" @select="selectGame" @open="openGameDetails" />
    </div>

    <!-- Top Filters -->
    <TopFilters v-model="currentFilter" />

    <!-- Loading Overlay -->
    <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-300" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="loading"
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
        <div class="w-12 h-12 border-4 border-white/20 border-t-remix-accent rounded-full animate-spin mb-4" />
        <p class="text-white/60 text-sm font-medium">Chargement de votre bibliothèque...</p>
      </div>
    </Transition>

    <!-- Empty State -->
    <Transition enter-active-class="transition-all duration-500" enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="!loading && filteredGames.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
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

        <Button v-if="currentFilter === 'all'" variant="primary" size="lg" :loading="syncing" :disabled="syncing"
          @click="openSettings">
          <template #icon>
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': syncing }" />
          </template>
          {{ "Connectez vos stores." }}
        </Button>
      </div>
    </Transition>

    <!-- Game Count Badge -->
    <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-4">
      <div v-if="!loading && filteredGames.length > 0"
        class="fixed bottom-20 right-4 sm:right-8 px-4 py-2 bg-black/80 border border-white/10 rounded-lg text-xs font-semibold text-white/50 backdrop-blur-md">
        {{ filteredGames.length }} {{ filteredGames.length === 1 ? "jeu" : "jeux" }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { onKeyStroke } from "@vueuse/core";
import { useLibraryStore } from "@/stores/library";
import { useGamepad } from "@/composables/useGamepad";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { Button } from "@/components/ui";
import { RefreshCw, Package } from "lucide-vue-next";
import type { Game } from "@/types";
import GameCarousel from "@/components/game/GameCarousel.vue";
import { HeroBanner } from "@/components/game";
import { TopFilters } from "@/components/layout";
import { storeToRefs } from "pinia";

const router = useRouter();
const libraryStore = useLibraryStore();
const { games } = storeToRefs(libraryStore)
const { on: onGamepad } = useGamepad();

// Carousel ref for programmatic scroll
const carouselRef = ref<InstanceType<typeof GameCarousel> | null>(null);

// Local state
const loading = ref(true);
const syncing = ref(false);
const currentFilter = ref("all");
const selectedGame = ref<Game | null>(null);
const playingGame = ref<Game | null>(null);

// Filter games based on current filter
const filteredGames = computed(() => {
  switch (currentFilter.value) {
    case "installed":
      return games.value.filter((g) => g.installed);
    case "epic":
      return games.value.filter((g) => g.store === "epic");
    case "gog":
      return games.value.filter((g) => g.store === "gog");
    case "amazon":
      return games.value.filter((g) => g.store === "amazon");
    case "steam":
      return games.value.filter((g) => g.store === "steam");
    default:
      // 'all' - sort alphabetically
      return games.value.slice().sort((a, b) => a.title.localeCompare(b.title));
  }
});

// Current selection index in carousel
const selectedIndex = ref(0);

// Navigate in carousel
function navigateCarousel(direction: "left" | "right") {
  const total = filteredGames.value.length;
  if (total === 0) return;

  if (direction === "left") {
    selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : total - 1; // Wrap to end
  } else {
    selectedIndex.value = selectedIndex.value < total - 1 ? selectedIndex.value + 1 : 0; // Wrap to beginning
  }

  // Update selected game
  selectedGame.value = filteredGames.value[selectedIndex.value] || null;

  // Scroll to the selected game (keyboard/gamepad navigation)
  nextTick(() => {
    carouselRef.value?.scrollToSelected();
  });
}

// Navigate filters (left/right via LB/RB)
const filterOrder = ["all", "installed", "epic", "gog", "amazon", "steam"];

function navigateFilters(direction: "up" | "down") {
  const currentIdx = filterOrder.indexOf(currentFilter.value);

  if (direction === "up" && currentIdx > 0) {
    currentFilter.value = filterOrder[currentIdx - 1];
  } else if (direction === "down" && currentIdx < filterOrder.length - 1) {
    currentFilter.value = filterOrder[currentIdx + 1];
  }
}

// Select a game
function selectGame(game: Game) {
  selectedGame.value = game;
  // Update index to match
  const idx = filteredGames.value.findIndex((g) => g.id === game.id);
  if (idx !== -1) {
    selectedIndex.value = idx;
  }
}

// Open game details
function openGameDetails(game: Game | null) {
  const gameToOpen = game || selectedGame.value;
  if (!gameToOpen) return;
  router.push(`/game/${gameToOpen.id}`);
}

// Open settings
function openSettings() {
  router.push("/settings");
}

// Load games
async function loadGames() {
  loading.value = true;
  try {
    await libraryStore.fetchGames();
    if (games.value.length === 0) {
      router.push("/settings");
    }
    // Auto-select first game
    if (filteredGames.value.length > 0) {
      selectedGame.value = filteredGames.value[0];
    }
  } catch (error) {
    console.error("Failed to load games:", error);
  } finally {
    loading.value = false;
  }
}

// Handle keyboard shortcuts
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
    openSettings();
  }
});

onKeyStroke("Enter", () => {
  if (selectedGame.value) {
    openGameDetails(selectedGame.value);
  }
});

onKeyStroke("a", () => {
  if (selectedGame.value) {
    openGameDetails(selectedGame.value);
  }
});

onKeyStroke("A", () => {
  if (selectedGame.value) {
    openGameDetails(selectedGame.value);
  }
});

onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => {
  router.back();
});

// Load games on mount
watch(
  () => libraryStore.games,
  async () => {
    await loadGames();
  },
  { immediate: true },
);

// Quick filter switch with LB/RB
function switchFilter(direction: "prev" | "next") {
  const currentIdx = filterOrder.indexOf(currentFilter.value);

  if (direction === "prev") {
    // Go to previous, wrap to last if at beginning
    currentFilter.value =
      currentIdx > 0 ? filterOrder[currentIdx - 1] : filterOrder[filterOrder.length - 1];
  } else {
    // Go to next, wrap to first if at end
    currentFilter.value =
      currentIdx < filterOrder.length - 1 ? filterOrder[currentIdx + 1] : filterOrder[0];
  }
}

// Setup gamepad handlers
onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (direction === "left") {
    navigateCarousel("left");
  } else if (direction === "right") {
    navigateCarousel("right");
  } else if (direction === "up") {
    navigateFilters("up");
  } else if (direction === "down") {
    navigateFilters("down");
  }
});

onGamepad("confirm", () => {
  if (selectedGame.value) {
    openGameDetails(selectedGame.value);
  }
});

onGamepad("options", () => {
  openSettings();
});

// LB/RB for quick filter switching
onGamepad("lb", () => {
  switchFilter("prev");
});

onGamepad("rb", () => {
  switchFilter("next");
});


</script>

<style scoped>
/* Custom transition duration */
.duration-600 {
  transition-duration: 600ms;
}

/* Blur effect when settings open (applied from parent) */
.view-back {
  opacity: 0.3;
  transform: scale(0.92) translateZ(0);
  filter: grayscale(0.8) blur(8px);
  pointer-events: none;
}
</style>
