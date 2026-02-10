<template>
  <!-- Settings Overlay (SteamOS Style) -->
  <SettingsOverlay
    :show="true"
    @close="closeSettings"
    @open-power-menu="showPowerModal = true"
  />

  <!-- Power Modal -->
  <PowerModal :show="showPowerModal" @close="showPowerModal = false" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import SettingsOverlay from "@/components/settings/SettingsOverlay.vue";
import PowerModal from "@/components/settings/PowerModal.vue";

const router = useRouter();
const showPowerModal = ref(false);

function closeSettings() {
  router.push("/");
}
</script>
