<template>
  <div class="space-y-2">
    <!-- Install Button -->
    <Button
      v-if="!game?.installation.installed && !isGameDownloading"
      variant="primary"
      size="lg"
      class="w-full"
      @click="openInstall"
    >
      <template #icon>
        <Download class="w-5 h-5" />
      </template>
      Installer
    </Button>

    <!-- Download Progress (from downloads store) -->
    <div v-if="isGameDownloading && currentDownload" class="space-y-3">
      <ProgressBar
        :value="currentDownload.progress"
        label="Téléchargement..."
        variant="gradient"
        :glow="true"
        bordered
        show-value
      >
        <template #subtitle>
          <span v-if="currentDownload.downloadSpeed" class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {{ currentDownload.downloadSpeed }}
          </span>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {{ currentDownload.downloadedSize || '0 MB' }} / {{ currentDownload.totalSize }}
          </span>
        </template>
      </ProgressBar>
    </div>

    <!-- Play Button -->
    <Button
      v-if="game?.installation.installed && !isLaunching"
      variant="success"
      size="lg"
      class="w-full"
      @click="playGame"
    >
      <template #icon>
        <Play class="w-5 h-5" />
      </template>
      Lancer le jeu
    </Button>

    <!-- Force Close Button -->
    <Button v-if="isLaunching" variant="danger" size="lg" class="w-full" @click="forceCloseGame">
      <template #icon>
        <Square class="w-5 h-5" />
      </template>
      Forcer la fermeture
    </Button>

    <!-- Install Modal (autonomous — no props, no events) -->
    <InstallModal />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button, ProgressBar } from "@/components/ui";
import { Download, Play, Square } from "lucide-vue-next";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useDownloadsStore } from "@/stores/downloads";
import InstallModal from "./InstallModal.vue";

/**
 * GameActions - Smart Component autonome
 * Gère les actions du jeu (Install/Play/Stop) via useCurrentGame + useDownloadsStore
 * Zéro props, zéro events — tout passe par les stores
 */

const { game, isLaunching, playGame, forceCloseGame } = useCurrentGame();
const downloadsStore = useDownloadsStore();

const currentDownload = computed(() => {
  if (!game.value) return undefined;
  return downloadsStore.getDownload(game.value.id);
});

const isGameDownloading = computed(() => {
  if (!game.value) return false;
  return downloadsStore.isDownloading(game.value.id);
});

function openInstall() {
  if (!game.value) return;
  downloadsStore.openInstallModal(game.value.id);
}
</script>
