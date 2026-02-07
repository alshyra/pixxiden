<template>
  <Modal v-model="showInstallModal" title="Installer le jeu" size="lg">
    <!-- Game Info Header -->
    <div class="flex items-center gap-4 pb-6 border-b border-white/10">
      <div
        class="w-20 h-20 rounded-xl bg-cover bg-center"
        :style="{ backgroundImage: `url(${game.assets.backgroundUrl || '/placeholder.png'})` }"
      ></div>
      <div class="flex-1">
        <h3 class="text-xl font-bold text-white">{{ game.info.title }}</h3>
        <div class="flex items-center gap-2 mt-1">
          <Badge :variant="game.storeData.store" :label="game.storeData.store.toUpperCase()" />
          <span class="text-sm text-white/50">Version {{ gameVersion }}</span>
        </div>
      </div>
    </div>

    <!-- Installation Path -->
    <div class="mt-6">
      <label class="block text-sm font-semibold text-white mb-2"> 📁 Dossier d'installation </label>
      <div class="flex gap-2">
        <input
          v-model="installPath"
          type="text"
          class="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all"
          placeholder="~/Games/Epic/Cyberpunk 2077"
        />
        <Button variant="outline" @click="browseInstallPath"> 📂 Parcourir </Button>
      </div>
      <p class="text-xs text-white/40 mt-2">Le jeu sera installé dans ce dossier</p>
    </div>

    <!-- Disk Space Info -->
    <div class="mt-6 p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl">
      <div class="flex justify-between items-center mb-3">
        <span class="text-sm text-white/70">Taille du jeu</span>
        <span class="text-sm font-bold text-white">{{ formatSize(gameSize) }}</span>
      </div>

      <div class="flex justify-between items-center mb-3">
        <span class="text-sm text-white/70">Espace disponible</span>
        <span
          class="text-sm font-bold"
          :class="hasEnoughSpace ? 'text-remix-success' : 'text-remix-error'"
        >
          {{ formatSize(availableSpace) }}
        </span>
      </div>

      <!-- Progress Bar -->
      <div class="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          :class="diskUsagePercent > 90 ? 'bg-remix-error' : 'bg-remix-accent'"
          :style="{ width: `${Math.min(diskUsagePercent, 100)}%` }"
        ></div>
      </div>

      <p
        v-if="gameSize > 0 && !hasEnoughSpace"
        class="flex items-center gap-2 mt-3 text-xs text-remix-error"
      >
        <AlertTriangle class="w-4 h-4" />
        Espace disque insuffisant pour installer ce jeu
      </p>
    </div>

    <!-- Wine/Proton Options (Windows games only) -->
    <div v-if="needsWine" class="mt-6">
      <label class="block text-sm font-semibold text-white mb-2">
        🍷 Couche de compatibilité
      </label>
      <Select
        v-model="selectedRunner"
        :options="runnerOptions"
        placeholder="Sélectionner Proton/Wine"
      />
      <p class="text-xs text-white/40 mt-2">
        {{ selectedRunnerDescription }}
      </p>
    </div>

    <!-- Additional Options -->
    <div class="mt-6 space-y-3">
      <Toggle
        v-model="createDesktopShortcut"
        label="Créer un raccourci bureau"
        description="Ajouter une icône sur le bureau"
      />

      <Toggle
        v-model="addToSteam"
        label="Ajouter à Steam (raccourci non-Steam)"
        description="Le jeu apparaîtra dans votre bibliothèque Steam"
      />
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between gap-4 w-full">
        <!-- Cancel -->
        <Button variant="ghost" @click="showInstallModal = false" class="flex-1"> Annuler </Button>

        <!-- Install -->
        <Button
          variant="primary"
          @click="confirmInstall"
          :disabled="(gameSize > 0 && !hasEnoughSpace) || installing"
          :loading="installing"
          class="flex-1"
        >
          <template #icon v-if="!installing">
            <Download class="w-5 h-5" />
          </template>
          {{ installing ? "Installation..." : "Installer" }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Modal, Select, Toggle, Button, Badge } from "@/components/ui";
import { Download, AlertTriangle } from "lucide-vue-next";
import * as api from "@/services/api";
import { getInstallationService } from "@/services";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import type { Game } from "@/types";

export interface InstallConfig {
  gameId: string;
  installPath: string;
  runner: string;
  createShortcut: boolean;
  addToSteam: boolean;
}

interface Props {
  game: Game;
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "install-started": [config: InstallConfig];
}>();

// Two-way binding for modal visibility
const showInstallModal = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Installation config
const installPath = ref(`~/Games/${props.game.storeData.store}/${props.game.info.title}`);
const gameSize = ref(0); // Bytes
const availableSpace = ref(0); // Bytes
const selectedRunner = ref("ge-proton-8-32");
const createDesktopShortcut = ref(true);
const addToSteam = ref(false);
const installing = ref(false);
const gameVersion = ref("1.0.0");

// Runner options
const runnerOptions = [
  { value: "ge-proton-8-32", label: "GE-Proton 8-32 (Recommandé)" },
  { value: "ge-proton-8-31", label: "GE-Proton 8-31" },
  { value: "proton-experimental", label: "Proton Experimental" },
  { value: "wine-ge-8-26", label: "Wine-GE 8-26" },
];

// Computed
const needsWine = computed(() => {
  // Check if game needs Wine/Proton (Windows game on Linux)
  return props.game.installation.runner !== "native";
});

const selectedRunnerDescription = computed(() => {
  const descriptions: Record<string, string> = {
    "ge-proton-8-32": "Version stable avec les derniers correctifs communautaires",
    "proton-experimental": "Version expérimentale avec support des derniers jeux",
  };
  return descriptions[selectedRunner.value] || "Couche de compatibilité Windows";
});

const diskUsagePercent = computed(() => {
  if (availableSpace.value === 0) return 0;
  const usedSpace = availableSpace.value - gameSize.value;
  return (usedSpace / availableSpace.value) * 100;
});

const hasEnoughSpace = computed(() => {
  // If game size is unknown (0), don't block installation
  if (gameSize.value === 0) return true;
  return availableSpace.value > gameSize.value * 1.1; // 10% margin
});

// Methods
function formatSize(bytes: number): string {
  if (bytes === 0) return "Inconnu";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function browseInstallPath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: installPath.value.startsWith("~") ? await homeDir() : installPath.value,
      title: "Choisir le dossier d'installation",
    });

    if (selected) {
      installPath.value = selected as string;
      // Refresh disk info for the new path
      await loadDiskInfo();
    }
  } catch (error) {
    console.error("Failed to open file picker:", error);
  }
}

async function loadDiskInfo() {
  try {
    const diskInfo = await api.getDiskInfo();
    // Find disk matching install path — expand ~ for comparison
    const expandedPath = installPath.value.startsWith("~")
      ? installPath.value.replace("~", "/home")
      : installPath.value;

    // Sort mount points by length descending to find the most specific match
    const sortedDisks = [...diskInfo].sort((a, b) => b.mountPoint.length - a.mountPoint.length);
    const targetDisk =
      sortedDisks.find((d) => expandedPath.startsWith(d.mountPoint)) || diskInfo[0];

    availableSpace.value = targetDisk?.availableSpace || 0;
  } catch (error) {
    console.error("Failed to get disk info:", error);
  }
}

async function loadGameInfo() {
  // Get disk space info (independent call — works via Rust get_disk_info)
  await loadDiskInfo();

  // Use data from Game prop for version and size
  gameVersion.value = "1.0.0";

  // Parse installSize from the Game prop if available (e.g. "50 GB")
  if (props.game.installation.installSize) {
    const sizeStr = props.game.installation.installSize;
    const match = sizeStr.match(/([\d.]+)\s*(GB|MB|TB|KB|B)/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
      };
      gameSize.value = Math.round(value * (multipliers[unit] || 0));
    }
  }
}

async function confirmInstall() {
  if (installing.value) return;
  // Allow install even if game size is unknown (0)
  if (gameSize.value > 0 && !hasEnoughSpace.value) return;

  installing.value = true;

  try {
    const installConfig: InstallConfig = {
      gameId: props.game.id,
      installPath: installPath.value,
      runner: needsWine.value ? selectedRunner.value : "native",
      createShortcut: createDesktopShortcut.value,
      addToSteam: addToSteam.value,
    };

    // Notify parent that install is starting (for UI state: close modal, show progress bar)
    emit("install-started", installConfig);

    // Start installation via InstallationService (JS-first)
    const installationService = getInstallationService();
    await installationService.installGame(props.game.id, props.game.storeData.store, {
      installPath: installPath.value,
    });
  } catch (error) {
    console.error("Failed to start installation:", error);
  } finally {
    installing.value = false;
    // Close modal after install finishes (or fails)
    showInstallModal.value = false;
  }
}

// Watch for modal open
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      loadGameInfo();
    }
  },
);
</script>
