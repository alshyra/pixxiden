<template>
  <div
    class="relative min-h-screen bg-remix-black overflow-hidden pb-20 transition-all duration-600"
  >
    <!-- Hero Banner -->
    <HeroBanner
      :game="selectedGame"
      :metadata="selectedMetadataGame"
      @open-details="openGameDetails(selectedGame)"
      class="transition-all duration-600"
    />

    <!-- Games Carousel -->
    <div class="absolute bottom-14 left-0 right-0">
      <GameCarousel
        ref="carouselRef"
        :games="filteredGames"
        :selected-id="selectedGame?.id"
        :playing-id="playingGame?.id"
        @select="selectGame"
        @open="openGameDetails"
      />
    </div>

    <!-- Bottom Filters -->
    <BottomFilters v-model="currentFilter" />

    <!-- Loading Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="loading"
        class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm"
      >
        <div
          class="w-12 h-12 border-4 border-white/20 border-t-remix-accent rounded-full animate-spin mb-4"
        />
        <p class="text-white/60 text-sm font-medium">Chargement de votre bibliothèque...</p>
      </div>
    </Transition>

    <!-- Empty State -->
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
        class="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
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
          @click="syncLibrary"
        >
          <template #icon>
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': syncing }" />
          </template>
          {{ syncing ? "Synchronisation..." : "Synchroniser les bibliothèques" }}
        </Button>
      </div>
    </Transition>

    <!-- Game Count Badge -->
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
        class="fixed bottom-20 right-4 sm:right-8 px-4 py-2 bg-black/80 border border-white/10 rounded-lg text-xs font-semibold text-white/50 backdrop-blur-md"
      >
        {{ filteredGames.length }} {{ filteredGames.length === 1 ? "jeu" : "jeux" }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useLibraryStore } from "@/stores/library";
import { useGamepad } from "@/composables/useGamepad";
import { Button } from "@/components/ui";
import { RefreshCw, Package } from "lucide-vue-next";
import type { Game } from "@/types";
import GameCarousel from "@/components/game/GameCarousel.vue";
import { HeroBanner } from "@/components/game";
import { BottomFilters } from "@/components/layout";

const router = useRouter();
const libraryStore = useLibraryStore();
const { on: onGamepad } = useGamepad();

// Carousel ref for programmatic scroll
const carouselRef = ref<InstanceType<typeof GameCarousel> | null>(null);

// Local state
const loading = ref(true);
const syncing = ref(false);
const currentFilter = ref("all");
const selectedGame = ref<Game | null>(null);
const playingGame = ref<Game | null>(null);
const selectedMetadataGame = ref(null);

// Filters - handled by BottomFilters component

// Filter games based on current filter
const filteredGames = computed(() => {
  let games = [...libraryStore.games];

  switch (currentFilter.value) {
    case "installed":
      games = games.filter((g) => g.installed);
      break;
    case "epic":
      games = games.filter((g) => g.store === "epic");
      break;
    case "gog":
      games = games.filter((g) => g.store === "gog");
      break;
    case "amazon":
      games = games.filter((g) => g.store === "amazon");
      break;
    case "steam":
      games = games.filter((g) => g.store === "steam");
      break;
    default:
      // 'all' - sort alphabetically
      games = games.sort((a, b) => a.title.localeCompare(b.title));
  }

  return games;
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

// Sync library
async function syncLibrary() {
  syncing.value = true;
  try {
    await libraryStore.syncLibrary();
  } catch (error) {
    console.error("Failed to sync library:", error);
  } finally {
    syncing.value = false;
  }
}

// Load games
async function loadGames() {
  loading.value = true;
  try {
    await libraryStore.fetchGames();

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
function handleKeyDown(e: KeyboardEvent) {
  // Don't trigger if typing in an input
  if (document.activeElement?.tagName === "INPUT") return;

  // Arrow keys for navigation
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    navigateCarousel("left");
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    navigateCarousel("right");
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    navigateFilters("up");
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    navigateFilters("down");
    return;
  }

  // Q/E keys for filter switching (LB/RB equivalent)
  if (e.key === "q" || e.key === "Q") {
    e.preventDefault();
    switchFilter("prev");
    return;
  }
  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    switchFilter("next");
    return;
  }

  // S key to open settings
  if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    openSettings();
  }

  // Enter / A to open game details
  if (e.key === "Enter" || e.key === "a" || e.key === "A") {
    if (selectedGame.value) {
      e.preventDefault();
      openGameDetails(selectedGame.value);
    }
  }

  // Escape / B to go back
  if (e.key === "Escape" || e.key === "b" || e.key === "B") {
    e.preventDefault();
    router.back();
  }
}

// Watch for filter changes
watch(
  filteredGames,
  () => {
    // Reset selection to first game
    selectedIndex.value = 0;

    // Update selected game
    if (filteredGames.value.length > 0) {
      selectedGame.value = filteredGames.value[0];
    } else {
      selectedGame.value = null;
    }
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

onMounted(() => {
  loadGames();

  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
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
