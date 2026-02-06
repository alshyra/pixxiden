<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <h2
        class="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      >
        Système
      </h2>
      <p class="text-gray-500 text-lg italic font-medium">
        Configuration des paramètres du noyau Pixxiden.
      </p>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex items-center justify-center gap-4 p-12 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[10px]"
    >
      <div class="w-6 h-6 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin" />
      <span class="text-white/50">Chargement des informations système...</span>
    </div>

    <div v-else class="space-y-8">
      <!-- System Info Card -->
      <Card variant="glass">
        <h3 class="text-[10px] uppercase tracking-[0.4em] text-[#5e5ce6] font-black mb-6">
          Noyau Système
        </h3>

        <div class="divide-y divide-white/8">
          <div class="flex justify-between items-center py-4">
            <span class="text-sm text-white/50">Système d'exploitation</span>
            <span class="text-sm font-semibold text-white">
              {{ systemInfo?.osName || "Inconnu" }}
            </span>
          </div>
          <div class="flex justify-between items-center py-4">
            <span class="text-sm text-white/50">Kernel</span>
            <span class="text-sm font-semibold text-[#5e5ce6]">{{
              systemInfo?.kernelVersion || "Inconnu"
            }}</span>
          </div>
          <div class="flex justify-between items-center py-4">
            <span class="text-sm text-white/50">Processeur</span>
            <span class="text-sm font-semibold text-white">{{
              systemInfo?.cpuBrand || "Inconnu"
            }}</span>
          </div>
          <div class="flex justify-between items-center py-4">
            <span class="text-sm text-white/50">Mémoire</span>
            <span class="text-sm font-semibold text-white">{{
              formatBytes(systemInfo?.totalMemory || 0)
            }}</span>
          </div>
        </div>
      </Card>

      <!-- Disk Info Card -->
      <Card v-if="diskInfo.length > 0" variant="glass">
        <h3 class="text-base font-bold text-white mb-4">Stockage</h3>
        <div v-for="(disk, index) in diskInfo" :key="index" class="mb-4 last:mb-0">
          <div class="flex justify-between text-[0.85rem] mb-2">
            <span class="text-white/60">{{ disk.mountPoint }}</span>
            <span class="text-white font-medium">
              {{ formatBytes(disk.usedSpace) }} / {{ formatBytes(disk.totalSpace) }}
            </span>
          </div>
          <ProgressBar
            :value="(disk.usedSpace / disk.totalSpace) * 100"
            :variant="disk.usedSpace / disk.totalSpace > 0.9 ? 'error' : 'accent'"
          />
        </div>
      </Card>

      <!-- System Updates Card -->
      <Card variant="glass">
        <SystemUpdates />
      </Card>

      <!-- Library Sync Card -->
      <Card variant="glass">
        <h3 class="text-[10px] uppercase tracking-[0.4em] text-[#5e5ce6] font-black mb-6">
          Bibliothèque
        </h3>

        <div class="divide-y divide-white/8">
          <div class="flex justify-between items-center py-4">
            <div>
              <span class="text-sm text-white font-medium">Synchronisation rapide</span>
              <p class="text-xs text-white/40 mt-0.5">Détecte les nouveaux jeux et enrichit les jeux sans métadonnées.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              :disabled="syncing"
              @click="handleSync"
            >
              <template v-if="syncing">
                <div class="w-4 h-4 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin mr-2" />
                Synchronisation...
              </template>
              <template v-else>
                <RefreshCw class="w-4 h-4 mr-2" />
                Synchroniser
              </template>
            </Button>
          </div>

          <div class="flex justify-between items-center py-4">
            <div>
              <span class="text-sm text-white font-medium">Re-synchronisation complète</span>
              <p class="text-xs text-white/40 mt-0.5">Force le rechargement de toutes les métadonnées et images.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              :disabled="syncing"
              @click="handleResync"
            >
              <template v-if="syncing">
                <div class="w-4 h-4 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin mr-2" />
                Re-synchronisation...
              </template>
              <template v-else>
                <RefreshCw class="w-4 h-4 mr-2" />
                Tout resynchroniser
              </template>
            </Button>
          </div>
        </div>

        <!-- Sync result toast -->
        <div v-if="syncMessage" class="mt-4 p-3 rounded-lg text-sm" :class="syncMessageClass">
          {{ syncMessage }}
        </div>
      </Card>

      <!-- Action Button -->
      <div class="flex justify-end">
        <Button
          variant="danger"
          size="lg"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 0 }"
          @click="shutdown"
        >
          <template #icon>
            <PowerIcon class="w-5 h-5" />
          </template>
          ÉTEINDRE LA MACHINE
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Card, Button, ProgressBar } from "@/components/ui";
import { Power as PowerIcon, RefreshCw } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";
import { useLibraryStore } from "@/stores/library";
import SystemUpdates from "./system-updates/SystemUpdates.vue";
import * as api from "@/services/api";

interface SystemInfo {
  osName?: string;
  kernelVersion?: string;
  cpuBrand?: string;
  totalMemory?: number;
}

interface DiskInfo {
  mountPoint: string;
  usedSpace: number;
  totalSpace: number;
}

const { on: onGamepad } = useGamepad();
const focusedIndex = ref(0);
const libraryStore = useLibraryStore();

// System state
const systemInfo = ref<SystemInfo | null>(null);
const diskInfo = ref<DiskInfo[]>([]);
const loading = ref(false);

// Sync state
const syncing = computed(() => libraryStore.syncing);
const syncMessage = ref<string | null>(null);
const syncSuccess = ref(true);

const syncMessageClass = computed(() =>
  syncSuccess.value
    ? "bg-green-500/10 border border-green-500/20 text-green-400"
    : "bg-red-500/10 border border-red-500/20 text-red-400",
);

async function handleSync() {
  syncMessage.value = null;
  try {
    await libraryStore.syncLibrary();
    syncMessage.value = `Synchronisation terminée — ${libraryStore.games.length} jeux dans la bibliothèque.`;
    syncSuccess.value = true;
  } catch {
    syncMessage.value = "Échec de la synchronisation.";
    syncSuccess.value = false;
  }
}

async function handleResync() {
  syncMessage.value = null;
  try {
    await libraryStore.resyncLibrary();
    syncMessage.value = `Re-synchronisation terminée — ${libraryStore.games.length} jeux enrichis.`;
    syncSuccess.value = true;
  } catch {
    syncMessage.value = "Échec de la re-synchronisation.";
    syncSuccess.value = false;
  }
}

// Shutdown system
async function shutdown() {
  if (confirm("Êtes-vous sûr de vouloir éteindre la machine ?")) {
    try {
      await api.shutdownSystem();
    } catch (_error) {
      // Shutdown failed silently
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Load system info
async function loadSystemInfo() {
  loading.value = true;
  try {
    systemInfo.value = await api.getSystemInfo();
    diskInfo.value = await api.getDiskInfo();
  } catch (_error) {
    // Failed to load system info
  } finally {
    loading.value = false;
  }
}

// Gamepad navigation
onMounted(() => {
  loadSystemInfo();
  onGamepad("navigate", ({ direction }: { direction: string }) => {
    // Navigation will be handled by SystemUpdates component
  });

  onGamepad("confirm", () => {
    if (focusedIndex.value === 0) {
      shutdown();
    }
  });
});
</script>
