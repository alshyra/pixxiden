<template>
  <Modal
    :model-value="isOpen"
    @update:model-value="onModalClose"
    title="Installer le jeu"
    size="lg"
  >
    <template v-if="game">
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

      <!-- Active Download Progress (visible when installing) -->
      <div v-if="currentDownload" class="mt-6 space-y-3">
        <div class="p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-white">{{ statusLabel }}</span>
            <span v-if="currentDownload.eta" class="text-xs text-white/50"
              >~{{ currentDownload.eta }}</span
            >
          </div>

          <ProgressBar
            :value="currentDownload.progress"
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

          <p
            v-if="currentDownload.status === 'error'"
            class="flex items-center gap-2 text-xs text-remix-error"
          >
            <AlertTriangle class="w-4 h-4" />
            {{ currentDownload.error }}
          </p>

          <p
            v-if="currentDownload.status === 'completed'"
            class="flex items-center gap-2 text-xs text-remix-success"
          >
            ✅ Installation terminée avec succès
          </p>
        </div>

        <!-- Live CLI Output Log -->
        <div class="rounded-xl border border-white/8 overflow-hidden">
          <button
            class="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-white/50 bg-black/40 hover:bg-black/60 transition-colors"
            @click="showOutputLog = !showOutputLog"
          >
            <span class="flex items-center gap-2">
              <Terminal class="w-3.5 h-3.5" />
              Sortie de la commande ({{ currentDownload.outputLines.length }} lignes)
            </span>
            <ChevronDown
              class="w-3.5 h-3.5 transition-transform"
              :class="{ 'rotate-180': showOutputLog }"
            />
          </button>
          <div
            v-if="showOutputLog"
            ref="outputLogRef"
            class="max-h-48 overflow-y-auto bg-black/60 px-4 py-2 font-mono text-[11px] leading-relaxed text-green-400/80 scroll-smooth"
          >
            <div
              v-for="(line, idx) in currentDownload.outputLines"
              :key="idx"
              class="whitespace-pre-wrap break-all"
            >
              {{ line }}
            </div>
            <div v-if="currentDownload.outputLines.length === 0" class="text-white/30 italic">
              En attente de la sortie...
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration (visible when NOT installing) -->
      <template v-if="!currentDownload">
        <!-- Installation Path -->
        <div class="mt-6">
          <label class="block text-sm font-semibold text-white mb-2"
            >📁 Dossier d'installation</label
          >
          <div class="flex gap-2">
            <input
              v-model="installPath"
              type="text"
              class="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-remix-accent/50 focus:shadow-glow-subtle transition-all"
              placeholder="~/Games/Epic/Cyberpunk 2077"
            />
            <Button variant="outline" @click="browseInstallPath">📂 Parcourir</Button>
          </div>
          <p class="text-xs text-white/40 mt-2">Le jeu sera installé dans ce dossier</p>
        </div>

        <!-- Disk Space Info -->
        <div class="mt-6 p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl">
          <div class="flex justify-between items-center mb-3">
            <span class="text-sm text-white/70">Taille du jeu</span>
            <span v-if="loadingSizeInfo" class="text-sm text-white/40 italic animate-pulse"
              >Chargement...</span
            >
            <span v-else class="text-sm font-bold text-white">{{ formatSize(gameSize) }}</span>
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
          <label class="block text-sm font-semibold text-white mb-2"
            >🍷 Couche de compatibilité</label
          >
          <Select
            v-model="selectedRunner"
            :options="runnerOptions"
            placeholder="Sélectionner Proton/Wine"
          />
          <p class="text-xs text-white/40 mt-2">{{ selectedRunnerDescription }}</p>
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
      </template>
    </template>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between gap-4 w-full">
        <Button variant="ghost" @click="onModalClose(false)" class="flex-1">
          {{ currentDownload ? "Fermer" : "Annuler" }}
        </Button>

        <Button
          v-if="!currentDownload"
          variant="primary"
          @click="confirmInstall"
          :disabled="gameSize > 0 && !hasEnoughSpace"
          class="flex-1"
        >
          <template #icon>
            <Download class="w-5 h-5" />
          </template>
          Installer
        </Button>

        <Button
          v-if="
            currentDownload &&
            currentDownload.status !== 'completed' &&
            currentDownload.status !== 'error'
          "
          variant="danger"
          @click="cancelCurrentDownload"
          class="flex-1"
        >
          Annuler le téléchargement
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Modal, Select, Toggle, Button, Badge, ProgressBar } from "@/components/ui";
import { Download, AlertTriangle, Terminal, ChevronDown } from "lucide-vue-next";
import * as api from "@/services/api";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useDownloadsStore } from "@/stores/downloads";

/**
 * InstallModal - Autonomous Smart Component
 *
 * - Reads game data from useCurrentGame composable (no props)
 * - Opens/closes via useDownloadsStore (no v-model, no events)
 * - Starts downloads via downloadsStore.startInstallation()
 * - Stays open during download to show progress
 * - User can close and track progress in Downloads view
 */

const { game } = useCurrentGame();
const downloadsStore = useDownloadsStore();

// === MODAL STATE (driven by downloads store) ===
const isOpen = computed(() => downloadsStore.isInstallModalOpen);

function onModalClose(_value: boolean) {
  downloadsStore.closeInstallModal();
}

// === CURRENT DOWNLOAD ===
const currentDownload = computed(() => {
  if (!game.value) return undefined;
  return downloadsStore.getDownload(game.value.id);
});

const statusLabel = computed(() => {
  if (!currentDownload.value) return "";
  const labels: Record<string, string> = {
    queued: "En attente...",
    downloading: "Téléchargement...",
    installing: "Installation...",
    completed: "Terminé !",
    error: "Erreur",
  };
  return labels[currentDownload.value.status] || "";
});

// === INSTALLATION CONFIG ===
const installPath = ref("");
const gameSize = ref(0);
const availableSpace = ref(0);
const selectedRunner = ref("ge-proton-8-32");
const createDesktopShortcut = ref(true);
const addToSteam = ref(false);
const gameVersion = ref("1.0.0");
const showOutputLog = ref(false);
const outputLogRef = ref<HTMLElement | null>(null);
const loadingSizeInfo = ref(false);

const runnerOptions = [
  { value: "ge-proton-8-32", label: "GE-Proton 8-32 (Recommandé)" },
  { value: "ge-proton-8-31", label: "GE-Proton 8-31" },
  { value: "proton-experimental", label: "Proton Experimental" },
  { value: "wine-ge-8-26", label: "Wine-GE 8-26" },
];

const needsWine = computed(() => game.value?.installation.runner !== "native");

const selectedRunnerDescription = computed(() => {
  const descriptions: Record<string, string> = {
    "ge-proton-8-32": "Version stable avec les derniers correctifs communautaires",
    "proton-experimental": "Version expérimentale avec support des derniers jeux",
  };
  return descriptions[selectedRunner.value] || "Couche de compatibilité Windows";
});

const diskUsagePercent = computed(() => {
  if (availableSpace.value === 0) return 0;
  return ((availableSpace.value - gameSize.value) / availableSpace.value) * 100;
});

const hasEnoughSpace = computed(() => {
  if (gameSize.value === 0) return true;
  return availableSpace.value > gameSize.value * 1.1;
});

// === METHODS ===
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
      await loadDiskInfo();
    }
  } catch (error) {
    console.error("Failed to open file picker:", error);
  }
}

async function loadDiskInfo() {
  try {
    const diskInfo = await api.getDiskInfo();
    const expandedPath = installPath.value.startsWith("~")
      ? installPath.value.replace("~", "/home")
      : installPath.value;

    const sortedDisks = [...diskInfo].sort((a, b) => b.mountPoint.length - a.mountPoint.length);
    const targetDisk =
      sortedDisks.find((d) => expandedPath.startsWith(d.mountPoint)) || diskInfo[0];

    availableSpace.value = targetDisk?.availableSpace || 0;
  } catch (error) {
    console.error("Failed to get disk info:", error);
  }
}

async function loadGameInfo() {
  if (!game.value) return;

  installPath.value = `~/Games/${game.value.storeData.store}`;
  gameSize.value = 0;

  await loadDiskInfo();
  gameVersion.value = "1.0.0";

  // Try to fetch accurate sizes from store CLI (e.g. legendary info)
  loadingSizeInfo.value = true;
  try {
    const sizeInfo = await downloadsStore.fetchGameInfo(game.value.id, game.value.storeData.store);
    if (sizeInfo) {
      gameSize.value = parseSizeToBytes(sizeInfo.diskSize);
      // Update available space after knowing game size
      await loadDiskInfo();
    }
  } catch (error) {
    console.warn("Failed to fetch game size info:", error);
  } finally {
    loadingSizeInfo.value = false;
  }

  // Fallback: use stored installSize if CLI didn't return anything
  if (gameSize.value === 0 && game.value.installation.installSize) {
    gameSize.value = parseSizeToBytes(game.value.installation.installSize);
  }
}

/**
 * Parse a size string like "20.06 GiB" or "13 GB" into bytes
 */
function parseSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/([\d.]+)\s*(GiB|GB|MiB|MB|TiB|TB|KiB|KB|B)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1000,
    KIB: 1024,
    MB: 1000 ** 2,
    MIB: 1024 ** 2,
    GB: 1000 ** 3,
    GIB: 1024 ** 3,
    TB: 1000 ** 4,
    TIB: 1024 ** 4,
  };
  return Math.round(value * (multipliers[unit] || 0));
}

async function confirmInstall() {
  if (!game.value) return;
  if (gameSize.value > 0 && !hasEnoughSpace.value) return;

  const totalSizeStr =
    gameSize.value > 0
      ? formatSize(gameSize.value)
      : game.value.installation.installSize || "Inconnu";

  // Auto-open the output log to show progress
  showOutputLog.value = true;

  // Delegate to downloads store — starts download in background
  // Modal stays open to show progress, user can close to continue navigating
  await downloadsStore.startInstallation(
    game.value.id,
    game.value.info.title,
    game.value.storeData.store,
    installPath.value,
    totalSizeStr,
  );
}

async function cancelCurrentDownload() {
  if (!game.value) return;
  await downloadsStore.cancelDownload(game.value.id);
}

// Load game info when modal opens
watch(isOpen, (open) => {
  if (open) {
    loadGameInfo();
    showOutputLog.value = false;
  }
});

// Auto-scroll output log to bottom when new lines arrive
watch(
  () => currentDownload.value?.outputLines.length,
  () => {
    if (showOutputLog.value && outputLogRef.value) {
      nextTick(() => {
        outputLogRef.value?.scrollTo({ top: outputLogRef.value.scrollHeight });
      });
    }
  },
);
</script>
