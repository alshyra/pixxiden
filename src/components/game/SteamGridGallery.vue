<template>
  <div class="flex-1 flex flex-col px-10 overflow-hidden">
    <!-- Gallery header -->
    <div class="flex items-center gap-3 mb-4 shrink-0">
      <span class="text-sm font-bold text-white">{{ slotLabel }}</span>

      <!-- Current image preview -->
      <div class="w-12 h-8 rounded-lg overflow-hidden bg-black/30 border border-white/10 shrink-0">
        <img v-if="currentSrc" :src="currentSrc" class="w-full h-full object-cover" />
      </div>

      <div class="flex gap-2 ml-auto">
        <Button
          data-testid="gallery-from-file"
          variant="outline"
          size="sm"
          :disabled="disabled"
          @click="$emit('from-file')"
        >
          📁 Depuis un fichier
        </Button>
        <Button
          v-if="isOverridden"
          data-testid="gallery-reset"
          variant="danger"
          size="sm"
          :disabled="disabled"
          @click="$emit('reset')"
        >
          Réinitialiser
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <span class="text-gray-500 text-sm animate-pulse italic">Chargement SteamGridDB…</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="images.length === 0" class="flex-1 flex items-center justify-center">
      <span class="text-gray-600 text-sm italic">Aucune image trouvée sur SteamGridDB</span>
    </div>

    <!-- Image grid -->
    <div v-else class="flex-1 overflow-y-auto pr-2 pb-4">
      <div class="flex flex-wrap gap-3 justify-center">
        <Card
          v-for="(img, idx) in images"
          :key="img.id"
          :data-id="`gallery-${idx}`"
          variant="outlined"
          :hoverable="true"
          :no-padding="true"
          class="gallery-item cursor-pointer transition-all focus:outline-none"
          :class="[
            focusedIndex === idx && 'ring-2 ring-[#5e5ce6]/30 !border-[#5e5ce6] scale-[1.02]',
          ]"
          :style="{ width: galleryCardWidth }"
          @click="$emit('select-image', idx)"
          @focus="$emit('focus', idx)"
        >
          <div class="overflow-hidden relative" :style="{ aspectRatio }">
            <img :src="img.thumb" class="w-full h-full object-cover" loading="lazy" />
            <div class="absolute bottom-1 right-1">
              <Badge variant="muted"> {{ img.width }}×{{ img.height }} </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Card, Button, Badge } from "@/components/ui";
import type { SteamGridDbImage } from "@/services/enrichment/SteamGridDbEnricher";

const props = defineProps<{
  slotLabel: string;
  aspectRatio: string;
  currentSrc: string;
  images: SteamGridDbImage[];
  loading: boolean;
  isOverridden: boolean;
  disabled: boolean;
  focusedIndex: number;
}>();

defineEmits<{
  "select-image": [index: number];
  "from-file": [];
  reset: [];
  focus: [index: number];
}>();

/** Card width adapted to the asset's aspect ratio so thumbnails look natural */
const galleryCardWidth = computed(() => {
  const [w, h] = props.aspectRatio.split("/").map(Number);
  const ratio = w / h;
  // Tall assets (grid 2:3) → narrow cards; wide assets (hero 96:31) → wide cards
  if (ratio < 1) return "10rem"; // portrait (grid)
  if (ratio > 2.5) return "20rem"; // ultra-wide (hero)
  if (ratio > 1.8) return "16rem"; // wide (horizontal_grid)
  return "12rem"; // square-ish (logo, icon)
});
</script>
