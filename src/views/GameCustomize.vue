<template>
  <div
    data-testid="game-customize"
    class="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden relative flex flex-col"
  >
    <!-- Header -->
    <header class="px-10 pt-8 pb-4 flex items-center gap-4 shrink-0">
      <Button data-testid="customize-back" variant="ghost" icon-only @click="goBack">
        <template #icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </template>
      </Button>
      <div>
        <h1 class="text-lg font-black tracking-tight">Personnaliser les images</h1>
        <p class="text-[10px] text-gray-500 mt-0.5">{{ game?.info.title }}</p>
      </div>
    </header>

    <!-- Level 3: Carousel Preview -->
    <template v-if="currentLevel === 'carousel'">
      <div class="flex-1 flex flex-col items-center justify-center px-10 overflow-hidden">
        <p class="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-bold">
          ← {{ browsingSlot?.label }} →
        </p>

        <Carousel v-model="carouselIndex" :images="carouselThumbs" />

        <div class="mt-6 flex items-center gap-4">
          <Button
            data-testid="carousel-apply"
            :variant="carouselSelected ? 'success' : 'primary'"
            size="md"
            :disabled="replacing !== null"
            @click="applyCarouselImage"
          >
            {{ carouselSelected ? "✓ Appliqué" : "Appliquer" }}
          </Button>
          <span class="text-[9px] text-gray-600 italic">D-pad ← → pour naviguer</span>
        </div>
      </div>
    </template>

    <!-- Level 2: Gallery Grid -->
    <SteamGridGallery
      v-else-if="currentLevel === 'gallery' && browsingSlot"
      :slot-label="browsingSlot.label"
      :aspect-ratio="browsingSlot.aspectRatio"
      :current-src="browsingSlotSrc"
      :images="galleryImages"
      :loading="galleryLoading"
      :is-overridden="overriddenTypes.has(browsingSlot.type)"
      :disabled="replacing !== null"
      :focused-index="focusedIndex"
      @select-image="openCarousel"
      @from-file="replaceFromFile(browsingSlot.type)"
      @reset="resetImage(browsingSlot.type)"
      @focus="focusedIndex = $event"
    />

    <!-- Level 1: Asset Slots -->
    <AssetSlotGrid
      v-else
      :slots="assetSlotDisplays"
      :overridden-types="overriddenTypes"
      :focused-index="focusedIndex"
      @select="onSlotSelect"
    />

    <!-- Footer hints -->
    <footer
      class="px-10 py-4 flex items-center justify-center gap-8 text-[9px] text-gray-600 shrink-0"
    >
      <span v-if="currentLevel === 'slots'"
        >🎮 D-pad pour naviguer · A pour sélectionner · B pour retour</span
      >
      <span v-else-if="currentLevel === 'gallery'"
        >🎮 D-pad pour parcourir · A pour prévisualiser · B pour retour</span
      >
      <span v-else>🎮 ← → pour défiler · A pour appliquer · B pour retour</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { error as logError, debug } from "@tauri-apps/plugin-log";
import { onKeyStroke } from "@vueuse/core";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useGamepad } from "@/composables/useGamepad";
import { useSideNavStore } from "@/stores/sideNav";
import { useLibraryStore } from "@/stores/library";
import { Button, Carousel } from "@/components/ui";
import { AssetSlotGrid, SteamGridGallery } from "@/components/game";
import type { AssetSlotDisplay } from "@/components/game/AssetSlotGrid.vue";
import { ImageOverrideRepository } from "@/lib/database/ImageOverrideRepository";
import { ImageCacheService } from "@/services/enrichment/ImageCacheService";
import { SteamGridDbEnricher } from "@/services/enrichment/SteamGridDbEnricher";
import type { SteamGridDbImage } from "@/services/enrichment/SteamGridDbEnricher";
import { getApiKeys } from "@/services/api";
import type { OverridableAssetType, ImageOverride } from "@/lib/database";
import type { GameAssets } from "@/types";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";

// === TYPES ===
type NavigationLevel = "slots" | "gallery" | "carousel";

interface AssetSlot {
  type: OverridableAssetType;
  label: string;
  description: string;
  assetField: keyof GameAssets;
  sgdbType: "heroes" | "grids" | "logos" | "icons";
  sgdbDimensions?: string;
  aspectRatio: string; // CSS aspect-ratio value
}

const ASSET_SLOTS: AssetSlot[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Bannière dans la page du jeu",
    assetField: "heroPath",
    sgdbType: "heroes",
    aspectRatio: "96/31",
  },
  {
    type: "grid",
    label: "Grille verticale",
    description: "Bibliothèque (jeu non survolé)",
    assetField: "gridPath",
    sgdbType: "grids",
    sgdbDimensions: "600x900",
    aspectRatio: "2/3",
  },
  {
    type: "horizontal_grid",
    label: "Grille horizontale",
    description: "Bibliothèque (jeu survolé)",
    assetField: "horizontalGridPath",
    sgdbType: "grids",
    sgdbDimensions: "920x430,460x215",
    aspectRatio: "92/43",
  },
  {
    type: "logo",
    label: "Logo",
    description: "Affiché à la place du titre",
    assetField: "logoPath",
    sgdbType: "logos",
    aspectRatio: "3/1",
  },
  {
    type: "icon",
    label: "Icône",
    description: "Détail du jeu",
    assetField: "iconPath",
    sgdbType: "icons",
    aspectRatio: "1/1",
  },
];

// === COMPOSABLES ===
const router = useRouter();
const { game, gameId } = useCurrentGame();
const { on: onGamepad } = useGamepad();
const sideNavStore = useSideNavStore();
const libraryStore = useLibraryStore();

// === STATE ===
const currentLevel = ref<NavigationLevel>("slots");
const focusedIndex = ref(0);
const replacing = ref<OverridableAssetType | null>(null);
const overriddenTypes = ref<Set<OverridableAssetType>>(new Set());

// Gallery
const browsingSlot = ref<AssetSlot | null>(null);
const galleryImages = ref<SteamGridDbImage[]>([]);
const galleryLoading = ref(false);
const sgdbGameId = ref<number | null>(null);

// Carousel
const carouselIndex = ref(0);
const carouselImages = ref<SteamGridDbImage[]>([]);
const carouselSelected = ref(false);

// === COMPUTED ===
const assetSlotDisplays = computed<AssetSlotDisplay[]>(() =>
  ASSET_SLOTS.map((slot) => {
    const path = game.value?.assets[slot.assetField];
    let currentSrc = "";
    if (path && typeof path === "string") {
      try {
        currentSrc = convertFileSrc(path);
      } catch {
        currentSrc = "";
      }
    }
    return {
      type: slot.type,
      label: slot.label,
      description: slot.description,
      aspectRatio: slot.aspectRatio,
      currentSrc,
    };
  }),
);

const browsingSlotSrc = computed(() => {
  if (!browsingSlot.value || !game.value) return "";
  const path = game.value.assets[browsingSlot.value.assetField];
  if (path && typeof path === "string") {
    try {
      return convertFileSrc(path);
    } catch {
      return "";
    }
  }
  return "";
});

const carouselThumbs = computed(() => carouselImages.value.map((img) => img.thumb));

// === NAVIGATION ===
function goBack() {
  if (currentLevel.value === "carousel") {
    currentLevel.value = "gallery";
    carouselSelected.value = false;
    focusedIndex.value = Math.min(carouselIndex.value, galleryImages.value.length - 1);
  } else if (currentLevel.value === "gallery") {
    currentLevel.value = "slots";
    browsingSlot.value = null;
    galleryImages.value = [];
    focusedIndex.value = 0;
  } else {
    router.back();
  }
}

onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => goBack());
onKeyStroke("ArrowLeft", () => {
  if (currentLevel.value === "carousel") navigateCarousel(-1);
  else navigateGrid("left");
});
onKeyStroke("ArrowRight", () => {
  if (currentLevel.value === "carousel") navigateCarousel(1);
  else navigateGrid("right");
});
onKeyStroke("ArrowUp", () => {
  if (currentLevel.value !== "carousel") navigateGrid("up");
});
onKeyStroke("ArrowDown", () => {
  if (currentLevel.value !== "carousel") navigateGrid("down");
});
onKeyStroke(["Enter", " "], () => handleConfirm());

onGamepad("back", () => {
  if (!sideNavStore.isOpen) goBack();
});
onGamepad("confirm", () => {
  if (!sideNavStore.isOpen) handleConfirm();
});

function handleConfirm() {
  if (currentLevel.value === "slots") {
    const slot = ASSET_SLOTS[focusedIndex.value];
    if (slot) openGallery(slot);
  } else if (currentLevel.value === "gallery" && galleryImages.value.length > 0) {
    openCarousel(focusedIndex.value);
  } else if (currentLevel.value === "carousel") {
    applyCarouselImage();
  }
}

function navigateGrid(direction: "up" | "down" | "left" | "right") {
  const cols = currentLevel.value === "slots" ? 3 : getGalleryColumns();
  const total = currentLevel.value === "slots" ? ASSET_SLOTS.length : galleryImages.value.length;
  const current = focusedIndex.value;
  if (total === 0) return;

  let next = current;
  switch (direction) {
    case "left":
      if (current % cols > 0) next = current - 1;
      break;
    case "right":
      if ((current + 1) % cols !== 0 && current < total - 1) next = current + 1;
      break;
    case "up":
      if (current >= cols) next = current - cols;
      break;
    case "down":
      if (current + cols < total) next = current + cols;
      break;
  }
  if (next !== current && next >= 0 && next < total) {
    focusedIndex.value = next;
    scrollFocusedIntoView();
  }
}

function getGalleryColumns(): number {
  const w = window.innerWidth;
  return w >= 1536 ? 6 : w >= 1280 ? 5 : 4;
}

function scrollFocusedIntoView() {
  nextTick(() => {
    const sel = currentLevel.value === "slots" ? "[data-testid='asset-slot']" : ".gallery-item";
    const el = document.querySelectorAll(sel)[focusedIndex.value];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function navigateCarousel(delta: number) {
  const next = carouselIndex.value + delta;
  if (next >= 0 && next < carouselImages.value.length) {
    carouselIndex.value = next;
    carouselSelected.value = false;
  }
}

// === SLOT SELECTION ===
function onSlotSelect(slot: AssetSlotDisplay) {
  const full = ASSET_SLOTS.find((s) => s.type === slot.type);
  if (full) openGallery(full);
}

// === GALLERY ACTIONS ===
async function openGallery(slot: AssetSlot) {
  browsingSlot.value = slot;
  currentLevel.value = "gallery";
  galleryImages.value = [];
  galleryLoading.value = true;
  focusedIndex.value = 0;

  try {
    const enricher = new SteamGridDbEnricher();
    const keys = await getApiKeys();
    if (!keys.steamgriddbApiKey) {
      await debug("SteamGridDB API key not configured");
      return;
    }
    enricher.configure({ apiKey: keys.steamgriddbApiKey });

    if (sgdbGameId.value === null && game.value?.info.title) {
      sgdbGameId.value = await enricher.searchGameId(game.value.info.title);
    }
    if (!sgdbGameId.value) return;

    galleryImages.value = await enricher.fetchImages(
      sgdbGameId.value,
      slot.sgdbType,
      slot.sgdbDimensions,
    );
  } catch (err) {
    await logError(`Failed to load SteamGridDB gallery: ${err}`);
  } finally {
    galleryLoading.value = false;
  }
}

function openCarousel(startIndex: number) {
  carouselImages.value = galleryImages.value;
  carouselIndex.value = startIndex;
  carouselSelected.value = false;
  currentLevel.value = "carousel";
}

async function applyCarouselImage() {
  if (!browsingSlot.value || !gameId.value || replacing.value) return;
  const img = carouselImages.value[carouselIndex.value];
  if (!img) return;

  try {
    replacing.value = browsingSlot.value.type;
    const cachedPath = await ImageCacheService.getInstance().cacheOverrideImage(
      gameId.value,
      browsingSlot.value.type,
      img.url,
    );
    if (!cachedPath) return;

    await ImageOverrideRepository.getInstance().setOverride(
      gameId.value,
      browsingSlot.value.type,
      cachedPath,
    );
    libraryStore.applyAssetOverride(gameId.value, browsingSlot.value.type, cachedPath);
    overriddenTypes.value.add(browsingSlot.value.type);
    carouselSelected.value = true;
    // Brief visual feedback then return to slots
    await new Promise((r) => setTimeout(r, 800));
    currentLevel.value = "slots";
    browsingSlot.value = null;
    galleryImages.value = [];
    carouselImages.value = [];
    carouselSelected.value = false;
    focusedIndex.value = 0;
  } catch (err) {
    await logError(`Failed to apply SteamGridDB image: ${err}`);
  } finally {
    replacing.value = null;
  }
}

async function replaceFromFile(assetType: OverridableAssetType) {
  if (!gameId.value || replacing.value) return;
  try {
    replacing.value = assetType;
    const selected = await open({
      directory: false,
      multiple: false,
      title: `Choisir une image (${assetType})`,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (!selected) return;

    const cachedPath = await ImageCacheService.getInstance().cacheOverrideFromLocal(
      gameId.value,
      assetType,
      selected as string,
    );
    if (!cachedPath) return;

    await ImageOverrideRepository.getInstance().setOverride(gameId.value, assetType, cachedPath);
    libraryStore.applyAssetOverride(gameId.value, assetType, cachedPath);
    overriddenTypes.value.add(assetType);
    // Brief visual feedback then return to slots
    await new Promise((r) => setTimeout(r, 600));
    currentLevel.value = "slots";
    browsingSlot.value = null;
    galleryImages.value = [];
    focusedIndex.value = 0;
  } catch (err) {
    await logError(`Failed to replace from file (${assetType}): ${err}`);
  } finally {
    replacing.value = null;
  }
}

async function resetImage(assetType: OverridableAssetType) {
  if (!gameId.value || replacing.value) return;
  try {
    replacing.value = assetType;
    await ImageOverrideRepository.getInstance().removeOverride(gameId.value, assetType);
    await libraryStore.revertAssetOverride(gameId.value);
    overriddenTypes.value.delete(assetType);
  } catch (err) {
    await logError(`Failed to reset image (${assetType}): ${err}`);
  } finally {
    replacing.value = null;
  }
}

// === LIFECYCLE ===
onMounted(async () => {
  if (!gameId.value) return;
  try {
    const overrides: ImageOverride[] = await ImageOverrideRepository.getInstance().getOverrides(
      gameId.value,
    );
    overriddenTypes.value = new Set(overrides.map((o) => o.assetType));
  } catch (err) {
    await logError(`Failed to load overrides: ${err}`);
  }
});
</script>
