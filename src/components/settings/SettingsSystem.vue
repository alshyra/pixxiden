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
            <span class="text-sm font-semibold text-white">{{
              systemInfo?.osName || "Inconnu"
            }}</span>
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

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          :loading="checkingUpdates"
          :disabled="checkingUpdates"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 0 }"
          @click="$emit('check-updates')"
        >
          <template #icon>
            <RefreshIcon class="w-5 h-5" />
          </template>
          {{ checkingUpdates ? "VÉRIFICATION..." : "VÉRIFIER LES MISES À JOUR" }}
        </Button>

        <Button
          variant="danger"
          size="lg"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 1 }"
          @click="$emit('shutdown')"
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
import { ref, onMounted } from "vue";
import { Card, Button, ProgressBar } from "@/components/ui";
import { RefreshCw as RefreshIcon, Power as PowerIcon } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";

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

defineProps<{
  loading: boolean;
  checkingUpdates: boolean;
  systemInfo: SystemInfo | null;
  diskInfo: DiskInfo[];
}>();

const emit = defineEmits<{
  "check-updates": [];
  shutdown: [];
}>();

const { on: onGamepad } = useGamepad();
const focusedIndex = ref(0);

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Gamepad navigation
onMounted(() => {
  onGamepad("navigate", ({ direction }: { direction: string }) => {
    if (direction === "left" && focusedIndex.value > 0) {
      focusedIndex.value--;
    } else if (direction === "right" && focusedIndex.value < 1) {
      focusedIndex.value++;
    }
  });

  onGamepad("confirm", () => {
    if (focusedIndex.value === 0) {
      emit("check-updates");
    } else if (focusedIndex.value === 1) {
      emit("shutdown");
    }
  });
});
</script>
