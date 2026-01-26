<template>
  <div class="space-y-2">
    <!-- Install Button -->
    <Button
      v-if="!game?.installed && !isDownloading"
      variant="primary"
      size="lg"
      class="w-full"
      @click="showInstallModal = true"
    >
      <template #icon>
        <Download class="w-5 h-5" />
      </template>
      Installer
    </Button>

    <!-- Download Progress -->
    <div v-if="isDownloading" class="space-y-3">
      <ProgressBar
        :value="downloadProgress ?? 0"
        label="Téléchargement..."
        variant="gradient"
        :glow="true"
        bordered
        show-value
      >
        <template #subtitle>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {{ downloadSpeed }}
          </span>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {{ downloadedSize }} / {{ totalSize }}
          </span>
        </template>
      </ProgressBar>
    </div>

    <!-- Play Button -->
    <Button
      v-if="game?.installed && !isLaunching"
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

    <!-- Install Modal -->
    <InstallModal
      v-if="game"
      v-model="showInstallModal"
      :game="game"
      @install-started="handleInstallStarted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button, ProgressBar } from "@/components/ui";
import { Download, Play, Square } from "lucide-vue-next";
import { useCurrentGame } from "@/composables/useCurrentGame";
import InstallModal from "./InstallModal.vue";

/**
 * GameActions - Smart Component autonome
 * Gère les actions du jeu (Install/Play/Stop) via le composable useCurrentGame
 * Ne reçoit aucune prop, récupère tout depuis le store
 */

const {
  game,
  isDownloading,
  downloadProgress,
  downloadedSize,
  downloadSpeed,
  totalSize,
  isLaunching,
  playGame,
  forceCloseGame,
  startInstallation,
} = useCurrentGame();

const showInstallModal = ref(false);

function handleInstallStarted(config: { installPath: string }) {
  showInstallModal.value = false;
  startInstallation(config.installPath);
}
</script>
