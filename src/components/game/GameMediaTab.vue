<template>
  <div class="h-full w-full flex items-center justify-center overflow-hidden">
    <Caroussel
      v-if="screenshots.length > 0"
      v-model="activeIndex"
      :images="screenshots"
    />

    <div
      v-else
      class="w-full h-full rounded-lg border border-white/10 bg-[#17171c] flex items-center justify-center text-[#a0a0b0] text-sm"
    >
      Aucun média disponible
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import Caroussel from "@/components/ui/Caroussel.vue";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useGamepad } from "@/composables/useGamepad";

const { screenshots } = useCurrentGame();
const { on: onGamepad } = useGamepad();

const activeIndex = ref(0);

const cleanupNavigate = onGamepad("navigate", (data) => {
  if (!screenshots.value.length) return;

  if (data?.direction === "left") {
    activeIndex.value = Math.max(0, activeIndex.value - 1);
  }

  if (data?.direction === "right") {
    activeIndex.value = Math.min(screenshots.value.length - 1, activeIndex.value + 1);
  }
});

onUnmounted(() => {
  cleanupNavigate();
});
</script>
