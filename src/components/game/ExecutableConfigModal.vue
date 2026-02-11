<template>
  <Modal v-model="showModal" title="Configurer l'exécutable" size="lg" :close-on-backdrop="true">
    <div class="space-y-4">
      <p class="text-xs text-gray-400 leading-relaxed">
        Chemin vers l'exécutable Windows (.exe) du jeu. Nécessaire pour le lancement via umu-run
        avec support manette (Steam Input).
      </p>

      <!-- Current value display -->
      <div v-if="currentPath" class="bg-white/5 rounded-lg p-3 border border-white/10">
        <span class="text-[8px] font-black text-gray-500 uppercase tracking-widest">Actuel</span>
        <p class="text-xs text-green-400 font-mono mt-1 break-all">{{ currentPath }}</p>
      </div>

      <!-- Input -->
      <Input
        v-model="executablePath"
        label="Chemin de l'exécutable (.exe)"
        placeholder="/home/user/Games/MonJeu/game.exe"
        type="text"
      />

      <p class="text-[10px] text-gray-500 italic">
        Cherchez un fichier .exe dans le dossier d'installation du jeu.
        <span v-if="installPath" class="block mt-1 text-gray-600">
          Dossier d'installation : <span class="font-mono text-gray-400">{{ installPath }}</span>
        </span>
      </p>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" @click="showModal = false">Annuler</Button>
      <Button
        variant="primary"
        size="sm"
        :disabled="!executablePath.trim()"
        @click="save"
      >
        Enregistrer
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Modal, Input, Button } from "@/components/ui";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useLibraryStore } from "@/stores/library";

/**
 * ExecutableConfigModal - Configure the Windows .exe path for umu-run direct launch
 *
 * Autonomous smart component: reads game data from useCurrentGame,
 * persists via library store.
 */

const { game } = useCurrentGame();
const libraryStore = useLibraryStore();

const showModal = defineModel<boolean>({ default: false });

const executablePath = ref("");

const currentPath = computed(() => game.value?.installation.executablePath || "");
const installPath = computed(() => game.value?.installation.installPath || "");

// Pre-fill with current value when modal opens
watch(showModal, (visible) => {
  if (visible) {
    executablePath.value = currentPath.value;
  }
});

async function save() {
  if (!game.value || !executablePath.value.trim()) return;
  await libraryStore.updateExecutablePath(game.value.id, executablePath.value.trim());
  showModal.value = false;
}
</script>
