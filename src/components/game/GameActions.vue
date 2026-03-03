<template>
  <div class="flex items-center gap-3 shrink-0">
    <Button
      v-if="!isLaunching"
      :class="[{ 'is-focused': actionFocused }]"
      variant="primary"
      :disabled="isGameDownloading"
      data-testid="primary-action-button"
      @click="handlePrimaryAction"
    >
      <Play class="w-4 h-4" />
      {{ primaryLabel }}
    </Button>

    <Button
      v-if="!isLaunching"
      class="settings-button"
      variant="outline"
      data-testid="customize-button"
      @click="openCustomize"
    >
      <Settings class="w-4 h-4" />
      Paramètres
    </Button>

    <div
      v-if="isGameDownloading && currentDownload"
      class="text-xs text-[#a0a0b0] font-semibold"
      data-testid="download-status"
    >
      Téléchargement {{ Math.round(currentDownload.progress || 0) }}%
    </div>

    <Button
      v-if="isLaunching"
      class="force-close-button"
      data-testid="force-close-button"
      @click="forceCloseGame"
    >
      <Square class="w-4 h-4" />
      Forcer la fermeture
    </Button>

    <!-- Install Modal (autonomous — no props, no events) -->
    <InstallModal />

  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { Play, Square, Settings } from "lucide-vue-next";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useDownloadsStore } from "@/stores/downloads";
import InstallModal from "./InstallModal.vue";
import Button from "../ui/Button.vue";

/**
 * GameActions - Smart Component autonome
 * Gère les actions du jeu (Install/Play/Stop/Uninstall) via useCurrentGame + useDownloadsStore
 *
 * Focus gamepad injecté depuis GameDetails pour afficher le ring visuel
 */

const { game, isLaunching, playGame, forceCloseGame } = useCurrentGame();
const router = useRouter();
const downloadsStore = useDownloadsStore();
// Inject focus state from parent (GameDetails)
const actionFocused = inject<Ref<boolean>>("actionFocused", ref(false));

const currentDownload = computed(() => {
  if (!game.value) return undefined;
  return downloadsStore.getDownload(game.value.id);
});

const isGameDownloading = computed(() => {
  if (!game.value) return false;
  return downloadsStore.isDownloading(game.value.id);
});

const primaryLabel = computed(() => {
  if (isGameDownloading.value) return "Téléchargement...";
  if (game.value?.installation.installed) return "▶ Jouer";
  return "Installer";
});

function handlePrimaryAction() {
  if (!game.value || isGameDownloading.value) return;

  if (!game.value.installation.installed) {
    downloadsStore.openInstallModal(game.value.id);
    return;
  }

  playGame();
}

function openCustomize() {
  if (!game.value) return;
  router.push({ name: "game-customize", params: { id: game.value.id } });
}
</script>
