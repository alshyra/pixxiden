<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-white">Mises à jour système</h3>
        <p class="text-sm text-gray-500">
          {{ statusText }}
        </p>
      </div>

      <!-- Status Badge -->
      <div
        v-if="!loading && !sudoersConfigured"
        class="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30"
      >
        <span class="text-xs font-bold text-amber-400">Configuration requise</span>
      </div>
      <div
        v-else-if="requiresReboot"
        class="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30"
      >
        <span class="text-xs font-bold text-red-400">Redémarrage requis</span>
      </div>
      <div
        v-else-if="updates.length > 0"
        class="px-3 py-1 rounded-full bg-[#5e5ce6]/20 border border-[#5e5ce6]/30"
      >
        <span class="text-xs font-bold text-[#5e5ce6]">{{ updates.length }} mise(s) à jour</span>
      </div>
      <div
        v-else-if="!loading && sudoersConfigured"
        class="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30"
      >
        <span class="text-xs font-bold text-green-400">Système à jour</span>
      </div>
    </div>

    <!-- Not Configured State -->
    <div v-if="!sudoersConfigured && !loading" class="space-y-4">
      <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-amber-200/90 text-sm mb-3">
              Pour gérer les mises à jour système depuis Pixxiden, une configuration unique est
              nécessaire.
            </p>
            <Button size="sm" variant="outline" @click="showConfigModal = true">
              <template #icon>
                <Settings class="w-4 h-4" />
              </template>
              Configurer maintenant
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="flex items-center justify-center py-8">
      <div class="flex items-center gap-4">
        <div
          class="w-6 h-6 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin"
        />
        <span class="text-white/50">{{ loadingMessage }}</span>
      </div>
    </div>

    <!-- Updates Available -->
    <div v-else-if="updates.length > 0" class="space-y-4">
      <!-- Updates List -->
      <div class="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        <!-- Categories -->
        <div
          v-for="(categoryPackages, category) in groupedUpdates"
          :key="category"
          class="border-b border-white/5 last:border-b-0"
        >
          <button
            @click="toggleCategory(category)"
            class="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3">
              <component :is="getCategoryIcon(category)" class="w-4 h-4 text-[#5e5ce6]" />
              <span class="text-sm font-medium text-white">{{ getCategoryLabel(category) }}</span>
              <span class="text-xs text-white/40">({{ categoryPackages.length }})</span>
            </div>
            <ChevronDown
              class="w-4 h-4 text-white/40 transition-transform"
              :class="{ 'rotate-180': expandedCategories.has(category) }"
            />
          </button>

          <!-- Package List -->
          <div v-if="expandedCategories.has(category)" class="px-4 pb-3 space-y-2">
            <div
              v-for="pkg in categoryPackages"
              :key="pkg.name"
              class="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm text-white">{{ pkg.name }}</span>
                <span
                  v-if="pkg.critical"
                  class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-red-500/20 text-red-400"
                >
                  critique
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-white/40">{{ pkg.currentVersion }}</span>
                <ArrowRight class="w-3 h-3 text-[#5e5ce6]" />
                <span class="text-[#5e5ce6]">{{ pkg.newVersion }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="flex items-center justify-between text-sm text-white/50">
        <span>Taille totale : {{ formatBytes(totalSize) }}</span>
        <span v-if="updates.some((p) => p.critical)" class="text-amber-400">
          ⚠️ Redémarrage recommandé après installation
        </span>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <Button variant="ghost" @click="checkUpdates" :disabled="installing">
          <template #icon>
            <RefreshCw class="w-4 h-4" />
          </template>
          Actualiser
        </Button>
        <Button
          variant="primary"
          @click="installUpdates"
          :loading="installing"
          :disabled="installing"
        >
          <template #icon>
            <Download class="w-4 h-4" />
          </template>
          {{ installing ? "Installation..." : "Installer tout" }}
        </Button>
      </div>
    </div>

    <!-- No Updates -->
    <div v-else class="space-y-4">
      <div class="flex flex-col items-center py-8 text-center">
        <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <CheckCircle class="w-8 h-8 text-green-400" />
        </div>
        <h4 class="text-white font-medium mb-1">Votre système est à jour</h4>
        <p class="text-sm text-gray-500">Dernière vérification : {{ lastCheckText }}</p>
      </div>

      <div class="flex justify-center">
        <Button variant="outline" @click="checkUpdates" :disabled="checking">
          <template #icon>
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': checking }" />
          </template>
          {{ checking ? "Vérification..." : "Vérifier les mises à jour" }}
        </Button>
      </div>
    </div>

    <!-- Installation Progress -->
    <div v-if="installing" class="space-y-4 mt-6">
      <div class="p-4 bg-[#0a0a0a] border border-white/10 rounded-xl">
        <div class="flex items-center gap-3 mb-4">
          <Download class="w-5 h-5 text-[#5e5ce6] animate-pulse" />
          <span class="text-sm text-white"
            >{{ installProgress.stage === "downloading" ? "Téléchargement" : "Installation" }} en
            cours...</span
          >
        </div>

        <div class="space-y-2">
          <div class="flex justify-between text-xs text-white/50">
            <span>{{ installProgress.packageName }}</span>
            <span>{{ Math.round(installProgress.progress) }}%</span>
          </div>
          <ProgressBar :value="installProgress.progress" variant="accent" />
        </div>

        <p class="mt-4 text-xs text-amber-400">
          ⚠️ Ne pas éteindre le système pendant l'installation
        </p>
      </div>
    </div>

    <!-- Reboot Required -->
    <div v-if="requiresReboot && !installing" class="mt-6">
      <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <div class="flex items-start gap-3">
          <Power class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <h4 class="text-red-400 font-medium mb-1">Redémarrage requis</h4>
            <p class="text-red-200/70 text-sm mb-3">
              Des mises à jour critiques ont été installées. Un redémarrage est recommandé pour les
              appliquer.
            </p>
            <div class="flex gap-3">
              <Button size="sm" variant="danger" @click="reboot">
                <template #icon>
                  <Power class="w-4 h-4" />
                </template>
                Redémarrer maintenant
              </Button>
              <Button size="sm" variant="ghost" @click="requiresReboot = false"> Plus tard </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sudoers Config Modal -->
    <SudoersConfigModal
      v-if="showConfigModal"
      @close="showConfigModal = false"
      @configured="onSudoersConfigured"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw, type Component } from "vue";
import { Button, ProgressBar } from "@/components/ui";
import SudoersConfigModal from "./SudoersConfigModal.vue";
import {
  AlertTriangle,
  Settings,
  CheckCircle,
  RefreshCw,
  Download,
  ChevronDown,
  ArrowRight,
  Power,
  Cpu,
  Monitor,
  Volume2,
  Gamepad2,
  Box,
  Library,
} from "lucide-vue-next";
import * as api from "@/services/api";
import type { UpdatePackage, UpdateProgressEvent, PackageCategory } from "@/services/api";

// State
const loading = ref(false);
const loadingMessage = ref("Chargement...");
const checking = ref(false);
const installing = ref(false);
const sudoersConfigured = ref(false);
const showConfigModal = ref(false);
const updates = ref<UpdatePackage[]>([]);
const totalSize = ref(0);
const requiresReboot = ref(false);
const lastCheck = ref<Date | null>(null);
const expandedCategories = ref(new Set<string>(["system", "graphics"]));

const installProgress = ref<UpdateProgressEvent>({
  stage: "downloading",
  packageName: "",
  progress: 0,
  downloaded: "",
  total: "",
  speed: "",
  eta: "",
});

// Computed
const statusText = computed(() => {
  if (!sudoersConfigured.value) return "Configuration requise pour activer les mises à jour";
  if (loading.value || checking.value) return "Vérification en cours...";
  if (updates.value.length > 0) return `${updates.value.length} mise(s) à jour disponible(s)`;
  return "Votre système est à jour";
});

const lastCheckText = computed(() => {
  if (!lastCheck.value) return "jamais";
  const diff = Date.now() - lastCheck.value.getTime();
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return lastCheck.value.toLocaleDateString("fr-FR");
});

const groupedUpdates = computed(() => {
  const groups: Record<string, UpdatePackage[]> = {};
  for (const pkg of updates.value) {
    if (!groups[pkg.category]) groups[pkg.category] = [];
    groups[pkg.category].push(pkg);
  }
  return groups;
});

// Methods
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getCategoryIcon(category: string): Component {
  const icons: Record<string, Component> = {
    system: markRaw(Cpu),
    graphics: markRaw(Monitor),
    audio: markRaw(Volume2),
    gaming: markRaw(Gamepad2),
    application: markRaw(Box),
    library: markRaw(Library),
  };
  return icons[category] || markRaw(Box);
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    system: "Système",
    graphics: "Graphiques",
    audio: "Audio",
    gaming: "Gaming",
    application: "Applications",
    library: "Bibliothèques",
  };
  return labels[category] || category;
}

function toggleCategory(category: string) {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category);
  } else {
    expandedCategories.value.add(category);
  }
}

async function checkSudoersStatus() {
  try {
    const status = await api.isSudoersConfigured();
    sudoersConfigured.value = status.configured;
    return status.configured;
  } catch (e) {
    console.error("Failed to check sudoers status:", e);
    return false;
  }
}

async function checkUpdates() {
  if (!sudoersConfigured.value) return;

  checking.value = true;
  try {
    const result = await api.checkSystemUpdates();
    updates.value = result.packages;
    totalSize.value = result.totalSize;
    requiresReboot.value = result.requiresReboot;
    lastCheck.value = new Date();
  } catch (e) {
    console.error("Failed to check updates:", e);
  } finally {
    checking.value = false;
  }
}

async function installUpdates() {
  if (updates.value.length === 0) return;

  installing.value = true;
  installProgress.value = {
    stage: "downloading",
    packageName: updates.value[0]?.name || "",
    progress: 0,
    downloaded: "",
    total: "",
    speed: "",
    eta: "",
  };

  try {
    // Listen for progress events
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<UpdateProgressEvent>("update-progress", (event) => {
      installProgress.value = event.payload;
    });

    const report = await api.installSystemUpdates();
    unlisten();

    // Clear updates list on success
    updates.value = [];
    requiresReboot.value = report.requiresReboot;

    console.log("Updates installed:", report);
  } catch (e) {
    console.error("Failed to install updates:", e);
  } finally {
    installing.value = false;
  }
}

async function reboot() {
  try {
    await api.rebootSystem();
  } catch (e) {
    console.error("Failed to reboot:", e);
  }
}

async function onSudoersConfigured() {
  showConfigModal.value = false;
  sudoersConfigured.value = true;
  // Auto-check for updates after configuration
  await checkUpdates();
}

// Lifecycle
onMounted(async () => {
  loading.value = true;
  loadingMessage.value = "Vérification de la configuration...";

  try {
    const configured = await checkSudoersStatus();

    if (configured) {
      loadingMessage.value = "Vérification des mises à jour...";
      await checkUpdates();

      // Also check if reboot is required
      requiresReboot.value = await api.requiresSystemReboot();
    }
  } catch (e) {
    console.error("Failed to initialize system updates:", e);
  } finally {
    loading.value = false;
  }
});
</script>
