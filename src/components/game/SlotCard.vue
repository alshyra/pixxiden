<template>
  <div
    :data-id="`slot-${index}`"
    data-testid="asset-slot"
    class="slot-card group flex flex-col rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-200"
    :class="[focused && 'slot-card--focused']"
    @click="$emit('select', slotData, index)"
  >
    <!-- Image area: flex-1 fills available space -->
    <div class="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
      <img
        v-if="slotData.currentSrc"
        :src="slotData.currentSrc"
        :alt="slotData.label"
        class="w-full h-full pointer-events-none select-none"
        :class="isContainType ? 'object-contain p-4' : 'object-cover'"
        draggable="false"
      />
      <div v-else class="flex flex-col items-center gap-2 text-gray-700">
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
      </div>

      <!-- Bottom fade gradient -->
      <div
        class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
      />
    </div>

    <!-- Info bar -->
    <div class="px-3 py-2 flex items-center justify-between shrink-0 bg-[#1a1d23]">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-[10px] font-bold text-gray-200 uppercase tracking-wider truncate">
          {{ slotData.label }}
        </span>
        <span class="text-[9px] text-gray-500 italic truncate">{{ slotData.description }}</span>
      </div>
      <Badge v-if="overridden" variant="default" label="Perso" class="shrink-0 ml-2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui";
import type { AssetSlotDisplay } from "./AssetSlotGrid.vue";

const props = defineProps<{
  slotData: AssetSlotDisplay;
  index: number;
  focused: boolean;
  overridden: boolean;
}>();

defineEmits<{
  select: [slot: AssetSlotDisplay, index: number];
}>();

/** Logos and icons use object-contain with padding to avoid edge clipping */
const isContainType = computed(
  () => props.slotData.type === "logo" || props.slotData.type === "icon",
);
</script>

<style scoped>
.slot-card {
  background: #1a1d23;
  border: 1px solid #2d323a;
}

.slot-card:hover {
  border-color: #3b82f6;
  background: #1e2229;
}

.slot-card--focused {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
</style>
