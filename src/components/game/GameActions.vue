<template>
  <div class="space-y-2">
    <!-- Install Button -->
    <Button
      v-if="!game?.installation.installed && !isGameDownloading"
      variant="primary"
      size="lg"
      class="w-full"
      :class="{ 'ring-2 ring-[#5e5ce6] shadow-[0_0_15px_rgba(94,92,230,0.4)]': actionFocused }"
      data-testid="install-button"
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
          <span
            v-if="currentDownload.downloadSpeed"
            class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter"
          >
            {{ currentDownload.downloadSpeed }}
          </span>
          <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {{ currentDownload.downloadedSize || "0 MB" }} / {{ currentDownload.totalSize }}
          </span>
        </template>
      </ProgressBar>
    </div>

    <!-- Play Button + Config -->
    <div
      v-if="game?.installation.installed && !isLaunching"
      class="flex gap-2"
    >
      <Button
        variant="success"
        size="lg"
        class="flex-1"
        :class="{ 'ring-2 ring-[#5e5ce6] shadow-[0_0_15px_rgba(94,92,230,0.4)]': actionFocused }"
        data-testid="play-button"
        @click="playGame"
      >
        <template #icon>
          <Play class="w-5 h-5" />
        </template>
        Lancer le jeu
      </Button>

      <!-- Exe Config Button (non-Steam games only) -->
      <Button
        v-if="game?.storeData.store !== 'steam'"
        variant="ghost"
        size="lg"
        class="shrink-0 !px-3"
        data-testid="exe-config-button"
        :title="game?.installation.executablePath ? 'Modifier l\'exécutable' : 'Configurer l\'exécutable'"
        @click="showExeConfig = true"
      >
        <Settings class="w-5 h-5" />
      </Button>
    </div>

    <!-- Force Close Button -->
    <Button
      v-if="isLaunching"
      variant="danger"
      size="lg"
      class="w-full"
      data-testid="force-close-button"
      @click="forceCloseGame"
    >
      <template #icon>
        <Square class="w-5 h-5" />
      </template>
      Forcer la fermeture
    </Button>

    <!-- Install Modal (autonomous — no props, no events) -->
    <InstallModal />

    <!-- Executable Config Modal -->
    <ExecutableConfigModal v-model="showExeConfig" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from "vue";
import { Button, ProgressBar } from "@/components/ui";
import { Download, Play, Square, Settings } from "lucide-vue-next";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useDownloadsStore } from "@/stores/downloads";
import InstallModal from "./InstallModal.vue";
import ExecutableConfigModal from "./ExecutableConfigModal.vue";

/**
 * GameActions - Smart Component autonome
 * Gère les actions du jeu (Install/Play/Stop) via useCurrentGame + useDownloadsStore
 * Zéro props, zéro events — tout passe par les stores
 *
 * Focus gamepad injecté depuis GameDetails pour afficher le ring visuel
 */

const { game, isLaunching, playGame, forceCloseGame } = useCurrentGame();
const downloadsStore = useDownloadsStore();
const showExeConfig = ref(false);

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

function openInstall() {
  if (!game.value) return;
  downloadsStore.openInstallModal(game.value.id);
}
</script>
