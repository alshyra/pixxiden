<template>
  <div class="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col p-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <Button variant="ghost" @click="goBack">
          <template #icon>
            <ArrowLeft class="w-5 h-5" />
          </template>
          Retour
        </Button>
        <h1 class="text-2xl font-bold text-white">Téléchargements</h1>
        <span
          v-if="downloadsStore.hasActiveDownloads"
          class="px-2 py-0.5 text-xs font-bold bg-remix-accent/20 text-remix-accent rounded-full"
        >
          {{ downloadsStore.totalActiveCount }} en cours
        </span>
      </div>

      <Button
        v-if="
          downloadsStore.completedDownloads.length > 0 || downloadsStore.failedDownloads.length > 0
        "
        variant="ghost"
        @click="downloadsStore.clearCompleted()"
      >
        Effacer l'historique
      </Button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto space-y-4">
      <!-- Active Downloads -->
      <section v-if="downloadsStore.activeDownloads.length > 0">
        <h2 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
          En cours ({{ downloadsStore.activeDownloads.length }})
        </h2>
        <div class="space-y-3">
          <DownloadCard
            v-for="download in downloadsStore.activeDownloads"
            :key="download.gameId"
            :download="download"
            @cancel="downloadsStore.cancelDownload(download.gameId)"
          />
        </div>
      </section>

      <!-- Completed Downloads -->
      <section v-if="downloadsStore.completedDownloads.length > 0">
        <h2 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
          Terminés ({{ downloadsStore.completedDownloads.length }})
        </h2>
        <div class="space-y-3">
          <DownloadCard
            v-for="download in downloadsStore.completedDownloads"
            :key="download.gameId"
            :download="download"
            @dismiss="downloadsStore.dismissDownload(download.gameId)"
          />
        </div>
      </section>

      <!-- Failed Downloads -->
      <section v-if="downloadsStore.failedDownloads.length > 0">
        <h2 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
          Échoués ({{ downloadsStore.failedDownloads.length }})
        </h2>
        <div class="space-y-3">
          <DownloadCard
            v-for="download in downloadsStore.failedDownloads"
            :key="download.gameId"
            :download="download"
            @dismiss="downloadsStore.dismissDownload(download.gameId)"
          />
        </div>
      </section>

      <!-- Empty State -->
      <div
        v-if="
          !downloadsStore.hasActiveDownloads &&
          downloadsStore.completedDownloads.length === 0 &&
          downloadsStore.failedDownloads.length === 0
        "
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <DownloadCloud class="w-20 h-20 text-white/20 mb-4" />
        <h2 class="text-xl font-bold text-white/60 mb-2">Aucun téléchargement</h2>
        <p class="text-sm text-white/40 max-w-sm">
          Installez un jeu depuis votre bibliothèque pour le voir apparaître ici.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { onKeyStroke } from "@vueuse/core";
import { useDownloadsStore } from "@/stores/downloads";
import { useGamepad } from "@/composables/useGamepad";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { Button } from "@/components/ui";
import { ArrowLeft, DownloadCloud } from "lucide-vue-next";
import DownloadCard from "@/components/game/DownloadCard.vue";

const router = useRouter();
const downloadsStore = useDownloadsStore();
const { on: onGamepad } = useGamepad();

function goBack() {
  router.back();
}

onKeyStroke(KEYBOARD_SHORTCUTS.BACK, goBack);
onGamepad("back", goBack);
</script>
