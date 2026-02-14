<template>
  <Modal v-model="showModal" title="Personnaliser les images" size="xl" :close-on-backdrop="true">
    <div class="space-y-4">
      <!-- === GALLERY VIEW: browse SteamGridDB images for a specific asset === -->
      <template v-if="browsingSlot">
        <div class="flex items-center gap-3 mb-2">
          <button
            class="px-2 py-1 text-[10px] font-medium rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
            @click="browsingSlot = null"
          >
            ← Retour
          </button>
          <span class="text-sm font-bold text-white">{{ browsingSlot.label }}</span>
          <span v-if="galleryLoading" class="text-[10px] text-gray-500 animate-pulse">
            Chargement SteamGridDB…
          </span>
        </div>

        <!-- Current image preview -->
        <div class="flex gap-3 items-start mb-3">
          <div
            class="w-20 h-14 rounded-lg overflow-hidden bg-black/30 border border-white/10 shrink-0"
          >
            <img v-if="browsingSlotSrc" :src="browsingSlotSrc" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] text-gray-500">Image actuelle</p>
            <div class="flex gap-2 mt-1">
              <button
                class="px-2 py-1 text-[10px] font-medium rounded-lg bg-white/5 hover:bg-[#5e5ce6]/20 text-gray-300 hover:text-white transition-all border border-white/5 hover:border-[#5e5ce6]/30"
                :disabled="replacing !== null"
                @click="replaceFromFile(browsingSlot.type)"
              >
                📁 Depuis un fichier
              </button>
              <button
                v-if="overriddenTypes.has(browsingSlot.type)"
                class="px-2 py-1 text-[10px] font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/30"
                :disabled="replacing !== null"
                @click="resetImage(browsingSlot.type)"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <!-- SteamGridDB gallery -->
        <div v-if="galleryImages.length > 0" class="space-y-2">
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            SteamGridDB ({{ galleryImages.length }} résultats)
          </p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto pr-1">
            <button
              v-for="img in galleryImages"
              :key="img.id"
              class="group relative aspect-[3/2] rounded-lg overflow-hidden bg-black/30 border border-white/10 hover:border-[#5e5ce6]/50 transition-all"
              :class="{ 'ring-2 ring-[#5e5ce6] border-[#5e5ce6]': replacing === browsingSlot.type }"
              :disabled="replacing !== null"
              @click="selectSteamGridDbImage(browsingSlot.type, img.url)"
            >
              <img :src="img.thumb" class="w-full h-full object-cover" loading="lazy" />
              <div
                class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
              >
                <span
                  class="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                >
                  Appliquer
                </span>
              </div>
              <div class="absolute bottom-0.5 right-0.5">
                <span class="text-[7px] text-gray-400 bg-black/60 px-1 rounded">
                  {{ img.width }}×{{ img.height }}
                </span>
              </div>
            </button>
          </div>
        </div>
        <div v-else-if="!galleryLoading" class="text-center py-6 text-gray-600 text-xs italic">
          Aucune image trouvée sur SteamGridDB pour ce type
        </div>
      </template>

      <!-- === GRID VIEW: all 6 asset slots === -->
      <template v-else>
        <p class="text-xs text-gray-400 leading-relaxed">
          Cliquez sur un type d'image pour parcourir SteamGridDB ou importer un fichier local.
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <button
            v-for="slot in assetSlots"
            :key="slot.type"
            class="group relative bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all hover:border-[#5e5ce6]/40 text-left"
            @click="openGallery(slot)"
          >
            <!-- Image preview -->
            <div class="aspect-[3/2] bg-black/30 flex items-center justify-center overflow-hidden">
              <img
                v-if="slot.currentSrc"
                :src="slot.currentSrc"
                :alt="slot.label"
                class="w-full h-full object-cover group-hover:brightness-75 transition-all"
              />
              <div v-else class="flex flex-col items-center gap-1 text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span class="text-[9px]">Aucune image</span>
              </div>
            </div>

            <!-- Label -->
            <div class="p-2 flex items-center justify-between">
              <span class="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                {{ slot.label }}
              </span>
              <span
                v-if="overriddenTypes.has(slot.type)"
                class="text-[8px] font-bold text-[#5e5ce6] uppercase tracking-wider"
              >
                Perso
              </span>
            </div>
          </button>
        </div>
      </template>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" @click="showModal = false">Fermer</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { error as logError, debug } from "@tauri-apps/plugin-log";
import { Modal, Button } from "@/components/ui";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useLibraryStore } from "@/stores/library";
import { ImageOverrideRepository } from "@/lib/database/ImageOverrideRepository";
import { ImageCacheService } from "@/services/enrichment/ImageCacheService";
import { SteamGridDbEnricher } from "@/services/enrichment/SteamGridDbEnricher";
import type { SteamGridDbImage } from "@/services/enrichment/SteamGridDbEnricher";
import { getApiKeys } from "@/services/api";
import type { OverridableAssetType, ImageOverride } from "@/lib/database";
import type { GameAssets } from "@/types";

interface AssetSlot {
  type: OverridableAssetType;
  label: string;
  assetField: keyof GameAssets;
  /** SteamGridDB API type endpoint */
  sgdbType: "heroes" | "grids" | "logos" | "icons";
  /** optional dimension filter */
  sgdbDimensions?: string;
}

const ASSET_SLOTS: AssetSlot[] = [
  { type: "hero", label: "Hero", assetField: "heroPath", sgdbType: "heroes" },
  {
    type: "cover",
    label: "Cover",
    assetField: "coverPath",
    sgdbType: "grids",
    sgdbDimensions: "600x900",
  },
  {
    type: "grid",
    label: "Grid",
    assetField: "gridPath",
    sgdbType: "grids",
    sgdbDimensions: "600x900",
  },
  {
    type: "horizontal_grid",
    label: "Grille horizontale",
    assetField: "horizontalGridPath",
    sgdbType: "grids",
    sgdbDimensions: "920x430,460x215",
  },
  { type: "logo", label: "Logo", assetField: "logoPath", sgdbType: "logos" },
  { type: "icon", label: "Icône", assetField: "iconPath", sgdbType: "icons" },
];

const { game, gameId } = useCurrentGame();
const libraryStore = useLibraryStore();

const showModal = defineModel<boolean>({ default: false });
const replacing = ref<OverridableAssetType | null>(null);
const overriddenTypes = ref<Set<OverridableAssetType>>(new Set());

// SteamGridDB gallery state
const browsingSlot = ref<AssetSlot | null>(null);
const galleryImages = ref<SteamGridDbImage[]>([]);
const galleryLoading = ref(false);
const sgdbGameId = ref<number | null>(null);

// Computed asset slots with resolved image sources
const assetSlots = computed(() =>
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
    return { ...slot, currentSrc };
  }),
);

// Resolved source for the currently browsed slot
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

// Load overrides when modal opens, reset gallery state
watch(showModal, async (visible) => {
  if (visible && gameId.value) {
    browsingSlot.value = null;
    galleryImages.value = [];
    sgdbGameId.value = null;
    try {
      const repo = ImageOverrideRepository.getInstance();
      const overrides: ImageOverride[] = await repo.getOverrides(gameId.value);
      overriddenTypes.value = new Set(overrides.map((o) => o.assetType));
    } catch (err) {
      await logError(`Failed to load overrides: ${err}`);
    }
  }
});

/**
 * Open the gallery view for a specific asset slot and load SteamGridDB images
 */
async function openGallery(slot: AssetSlot) {
  browsingSlot.value = slot;
  galleryImages.value = [];
  galleryLoading.value = true;

  try {
    const enricher = new SteamGridDbEnricher();
    const keys = await getApiKeys();

    if (!keys.steamgriddbApiKey) {
      await debug("SteamGridDB API key not configured — skipping gallery load");
      return;
    }

    enricher.configure({ apiKey: keys.steamgriddbApiKey });

    // Resolve SteamGridDB game ID (cached for the session)
    if (sgdbGameId.value === null && game.value?.info.title) {
      sgdbGameId.value = await enricher.searchGameId(game.value.info.title);
    }

    if (!sgdbGameId.value) return;

    const images = await enricher.fetchImages(sgdbGameId.value, slot.sgdbType, slot.sgdbDimensions);
    galleryImages.value = images;
  } catch (err) {
    await logError(`Failed to load SteamGridDB gallery: ${err}`);
  } finally {
    galleryLoading.value = false;
  }
}

/**
 * Apply a SteamGridDB image as override (download from URL)
 */
async function selectSteamGridDbImage(assetType: OverridableAssetType, imageUrl: string) {
  if (!gameId.value || replacing.value) return;

  try {
    replacing.value = assetType;

    const cacheService = ImageCacheService.getInstance();
    const cachedPath = await cacheService.cacheOverrideImage(gameId.value, assetType, imageUrl);

    if (!cachedPath) return;

    const repo = ImageOverrideRepository.getInstance();
    await repo.setOverride(gameId.value, assetType, cachedPath);

    libraryStore.applyAssetOverride(gameId.value, assetType, cachedPath);
    overriddenTypes.value.add(assetType);
  } catch (err) {
    await logError(`Failed to apply SteamGridDB image (${assetType}): ${err}`);
  } finally {
    replacing.value = null;
  }
}

/**
 * Open file picker and replace an image asset from a local file
 */
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

    const sourcePath = selected as string;
    const cacheService = ImageCacheService.getInstance();
    const cachedPath = await cacheService.cacheOverrideFromLocal(
      gameId.value,
      assetType,
      sourcePath,
    );

    if (!cachedPath) return;

    const repo = ImageOverrideRepository.getInstance();
    await repo.setOverride(gameId.value, assetType, cachedPath);

    libraryStore.applyAssetOverride(gameId.value, assetType, cachedPath);
    overriddenTypes.value.add(assetType);
  } catch (err) {
    await logError(`Failed to replace image from file (${assetType}): ${err}`);
  } finally {
    replacing.value = null;
  }
}

/**
 * Reset an overridden image back to the enriched version
 */
async function resetImage(assetType: OverridableAssetType) {
  if (!gameId.value || replacing.value) return;

  try {
    replacing.value = assetType;

    const repo = ImageOverrideRepository.getInstance();
    await repo.removeOverride(gameId.value, assetType);

    await libraryStore.revertAssetOverride(gameId.value);
    overriddenTypes.value.delete(assetType);
  } catch (err) {
    await logError(`Failed to reset image (${assetType}): ${err}`);
  } finally {
    replacing.value = null;
  }
}
</script>
