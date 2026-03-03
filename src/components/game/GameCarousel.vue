<template>
  <div class="game-carousel relative">
    <!-- Virtual scroll container — only visible cards are in the DOM -->
    <div
      ref="carouselRef"
      class="relative overflow-x-auto scrollbar-hide"
      style="height: 340px"
      @scroll="updateScrollState"
      @wheel="handleWheel"
    >
      <!-- Width spacer: gives the scroll container its full scrollable width
           without rendering every card. Height matches container so the
           absolutely-positioned cards are clipped correctly. -->
      <div :style="{ width: `${totalWidth}px`, height: '340px' }"></div>

      <!-- Rendered visible slice, shifted to its correct absolute position -->
      <div
        class="absolute top-0 flex gap-4 py-6"
        :style="{ left: `${renderOffsetLeft}px` }"
      >
        <GameCard
          v-for="{ game } in visibleGames"
          :key="game.id"
          :game="game"
          :selected="selectedId === game.id"
          :playing="playingId === game.id"
          class="flex-shrink-0 w-40 md:w-48"
          @mouseenter="emit('select', game)"
          @click="emit('open', game)"
        />
      </div>
    </div>

    <!-- Navigation Arrows -->
    <Button
      v-if="canScrollLeft"
      variant="ghost"
      icon-only
      class="absolute left-2 top-1/2 -translate-y-1/2 z-20 !bg-black/60 hover:!bg-black/80"
      @click="scrollLeft"
    >
      <template #icon>
        <ChevronLeft class="w-5 h-5" />
      </template>
    </Button>

    <Button
      v-if="canScrollRight"
      variant="ghost"
      icon-only
      class="absolute right-2 top-1/2 -translate-y-1/2 z-20 !bg-black/60 hover:!bg-black/80"
      @click="scrollRight"
    >
      <template #icon>
        <ChevronRight class="w-5 h-5" />
      </template>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import type { Game } from "@/types";
import { Button } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import GameCard from "./GameCard.vue";

// ── Virtual scroll constants ──────────────────────────────────────────────────
// Keep in sync with the Tailwind classes used on GameCard.
const CARD_WIDTH = 192; // w-48  = 12 rem = 192 px
const CARD_GAP = 16; //   gap-4 =  1 rem =  16 px
const PADDING_X = 48; //  px-12 =  3 rem =  48 px
const BUFFER = 8; //      extra cards rendered on each side of the viewport

const props = defineProps<{
  games: Game[];
  selectedId?: string;
  playingId?: string;
  autoScrollOnSelect?: boolean; // Only scroll on keyboard/gamepad navigation
}>();

const emit = defineEmits<{
  select: [game: Game];
  open: [game: Game];
}>();

const carouselRef = ref<HTMLElement>();
const canScrollLeft = ref(false);
const canScrollRight = ref(true);
const scrollPosition = ref(0);
const containerWidth = ref(1920); // overwritten once mounted

// ── Computed ──────────────────────────────────────────────────────────────────

/** Full scrollable width for the spacer div. */
const totalWidth = computed(
  () => PADDING_X * 2 + Math.max(0, props.games.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP),
);

/** Index range of cards currently within the visible viewport + buffer. */
const visibleRange = computed(() => {
  const stride = CARD_WIDTH + CARD_GAP;
  const effective = Math.max(0, scrollPosition.value - PADDING_X);
  const start = Math.max(0, Math.floor(effective / stride) - BUFFER);
  const end = Math.min(
    props.games.length,
    Math.ceil((effective + containerWidth.value) / stride) + BUFFER,
  );
  return { start, end };
});

/** Only the games that need to be rendered right now. */
const visibleGames = computed(() =>
  props.games.slice(visibleRange.value.start, visibleRange.value.end).map((game, local) => ({
    game,
    index: visibleRange.value.start + local,
  })),
);

/** CSS `left` offset so the rendered slice lands at the correct position. */
const renderOffsetLeft = computed(
  () => PADDING_X + visibleRange.value.start * (CARD_WIDTH + CARD_GAP),
);

// ── Scroll helpers ────────────────────────────────────────────────────────────

function updateScrollState() {
  if (!carouselRef.value) return;
  const { scrollLeft, scrollWidth, clientWidth } = carouselRef.value;
  scrollPosition.value = scrollLeft;
  containerWidth.value = clientWidth;
  canScrollLeft.value = scrollLeft > 0;
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 10;
}

function scrollLeft() {
  carouselRef.value?.scrollBy({ left: -400, behavior: "smooth" });
}

function scrollRight() {
  carouselRef.value?.scrollBy({ left: 400, behavior: "smooth" });
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  carouselRef.value?.scrollBy({ left: e.deltaY * 2, behavior: "auto" });
}

// ── Programmatic scroll to selected ──────────────────────────────────────────

/**
 * Scroll so the selected card is centred in the viewport.
 * Position is derived from the card index — no per-card DOM refs required.
 */
function scrollToSelected() {
  if (!props.selectedId || !carouselRef.value) return;
  const index = props.games.findIndex((g) => g.id === props.selectedId);
  if (index === -1) return;

  const stride = CARD_WIDTH + CARD_GAP;
  const cardCenter = PADDING_X + index * stride + CARD_WIDTH / 2;
  const target = cardCenter - carouselRef.value.clientWidth / 2;

  carouselRef.value.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
}

defineExpose({ scrollToSelected });

watch(
  () => props.selectedId,
  () => {
    if (props.autoScrollOnSelect) {
      nextTick(() => scrollToSelected());
    }
  },
);

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateScrollState();
  if (carouselRef.value) {
    containerWidth.value = carouselRef.value.clientWidth;
    resizeObserver = new ResizeObserver(() => {
      if (carouselRef.value) containerWidth.value = carouselRef.value.clientWidth;
    });
    resizeObserver.observe(carouselRef.value);
  }
  if (props.autoScrollOnSelect) {
    nextTick(() => scrollToSelected());
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
