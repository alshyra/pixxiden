<template>
  <div class="flex-1 flex flex-col items-center justify-center px-10">
    <p class="text-xs text-gray-500 mb-8 italic">
      Sélectionnez un type d'image pour parcourir SteamGridDB ou importer un fichier local.
    </p>

    <div class="grid grid-cols-3 gap-6 w-full max-w-4xl">
      <Card
        v-for="(slot, idx) in slots"
        :key="slot.type"
        :data-id="`slot-${idx}`"
        data-testid="asset-slot"
        variant="outlined"
        :hoverable="true"
        :no-padding="true"
        :class="[
          'cursor-pointer transition-all focus:outline-none',
          focusedIndex === idx && 'ring-2 ring-[#5e5ce6]/30 !border-[#5e5ce6] scale-[1.02]',
        ]"
        @click="$emit('select', slot, idx)"
      >
        <!-- Image preview -->
        <div class="aspect-[16/9] bg-black/30 flex items-center justify-center overflow-hidden">
          <img
            v-if="slot.currentSrc"
            :src="slot.currentSrc"
            :alt="slot.label"
            class="w-full h-full object-cover hover:brightness-75 transition-all duration-300"
          />
          <div v-else class="flex flex-col items-center gap-2 text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-10 h-10"
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
            <span class="text-[10px] font-medium">Aucune image</span>
          </div>
        </div>

        <!-- Label bar -->
        <div class="p-3 flex items-center justify-between">
          <span class="text-[11px] font-black text-gray-300 uppercase tracking-widest">
            {{ slot.label }}
          </span>
          <Badge v-if="overriddenTypes.has(slot.type)" variant="default" label="Perso" />
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, Badge } from "@/components/ui";
import type { OverridableAssetType } from "@/lib/database";

export interface AssetSlotDisplay {
  type: OverridableAssetType;
  label: string;
  currentSrc: string;
}

defineProps<{
  slots: AssetSlotDisplay[];
  overriddenTypes: Set<OverridableAssetType>;
  focusedIndex: number;
}>();

defineEmits<{
  select: [slot: AssetSlotDisplay, index: number];
}>();
</script>
