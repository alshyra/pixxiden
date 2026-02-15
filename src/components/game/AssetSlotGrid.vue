<template>
  <div class="flex-1 flex flex-col items-center justify-center px-10 overflow-hidden">
    <p class="text-xs text-gray-500 mb-4 italic">
      Sélectionnez un type d'image pour parcourir SteamGridDB ou importer un fichier local.
    </p>

    <!-- 3-col × 2-row grid, fills available space, no scroll -->
    <div class="grid grid-cols-3 grid-rows-2 gap-6 w-full max-w-7xl flex-1 min-h-0 max-h-[70vh]">
      <!-- Hero: col 1–2, row 1 -->
      <SlotCard
        v-if="slotMap.hero"
        :slot-data="slotMap.hero"
        :index="slotIndex('hero')"
        :focused="focusedIndex === slotIndex('hero')"
        :overridden="overriddenTypes.has('hero')"
        class="col-span-2 row-span-1"
        @select="onSelect"
      />

      <!-- Grille verticale: col 3, row 1–2 -->
      <SlotCard
        v-if="slotMap.grid"
        :slot-data="slotMap.grid"
        :index="slotIndex('grid')"
        :focused="focusedIndex === slotIndex('grid')"
        :overridden="overriddenTypes.has('grid')"
        class="row-span-2"
        @select="onSelect"
      />

      <!-- Col 1, row 2: Logo + Icon (flex row) -->
      <div class="flex gap-4">
        <SlotCard
          v-if="slotMap.logo"
          :slot-data="slotMap.logo"
          :index="slotIndex('logo')"
          :focused="focusedIndex === slotIndex('logo')"
          :overridden="overriddenTypes.has('logo')"
          class="flex-[2]"
          @select="onSelect"
        />
        <SlotCard
          v-if="slotMap.icon"
          :slot-data="slotMap.icon"
          :index="slotIndex('icon')"
          :focused="focusedIndex === slotIndex('icon')"
          :overridden="overriddenTypes.has('icon')"
          class="flex-1"
          @select="onSelect"
        />
      </div>

      <!-- Col 2, row 2: Grille horizontale (capsule) -->
      <SlotCard
        v-if="slotMap.horizontal_grid"
        :slot-data="slotMap.horizontal_grid"
        :index="slotIndex('horizontal_grid')"
        :focused="focusedIndex === slotIndex('horizontal_grid')"
        :overridden="overriddenTypes.has('horizontal_grid')"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SlotCard from "./SlotCard.vue";
import type { OverridableAssetType } from "@/lib/database";

export interface AssetSlotDisplay {
  type: OverridableAssetType;
  label: string;
  description: string;
  aspectRatio: string;
  currentSrc: string;
}

const props = defineProps<{
  slots: AssetSlotDisplay[];
  overriddenTypes: Set<OverridableAssetType>;
  focusedIndex: number;
}>();

const emit = defineEmits<{
  select: [slot: AssetSlotDisplay, index: number];
}>();

/** Quick lookup by type */
const slotMap = computed(() => {
  const map: Partial<Record<OverridableAssetType, AssetSlotDisplay>> = {};
  for (const s of props.slots) map[s.type] = s;
  return map;
});

/** Original index for a type (for focus navigation) */
function slotIndex(type: OverridableAssetType): number {
  return props.slots.findIndex((s) => s.type === type);
}

function onSelect(slot: AssetSlotDisplay, idx: number) {
  emit("select", slot, idx);
}
</script>
