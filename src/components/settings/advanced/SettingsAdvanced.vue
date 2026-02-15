<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <p class="text-gray-500 text-lg italic font-medium">
        Configuration experte de la couche de compatibilité.
      </p>
    </header>

    <div class="flex flex-col gap-6">
      <Card variant="glass" class="!p-6">
        <!-- Proton Version -->
        <SettingsRow
          title="Version Proton Global"
          description="Compatibilité par défaut pour les titres Windows."
          :class="{
            'ring-2 ring-[#5e5ce6] shadow-[0_0_15px_rgba(94,92,230,0.4)] rounded-lg':
              focusedIndex === 0,
          }"
        >
          <Select
            :model-value="protonVersion"
            :options="protonVersions"
            placeholder="Sélectionner une version"
            @update:model-value="(val) => updateProtonVersion(String(val))"
          />
        </SettingsRow>

        <!-- MangoHud Overlay -->
        <SettingsRow
          title="MangoHud Overlay"
          description="Affiche FPS, températures et utilisation matérielle."
          :divider="false"
          :class="{
            'ring-2 ring-[#5e5ce6] shadow-[0_0_15px_rgba(94,92,230,0.4)] rounded-lg':
              focusedIndex === 1,
          }"
        >
          <Toggle :model-value="mangoHudEnabled" @update:model-value="updateMangoHud" />
        </SettingsRow>
      </Card>

      <!-- Info message -->
      <div
        class="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[0.85rem] text-orange-300/80"
      >
        <AlertTriangle class="w-5 h-5 flex-shrink-0" />
        <span>Ces paramètres affectent le comportement global. Modifiez avec précaution.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, Select, Toggle } from "@/components/ui";
import SettingsRow from "../layout/SettingsRow.vue";
import { AlertTriangle } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useGamepad } from "@/composables/useGamepad";
import * as api from "@/services/api";
import { info, error as logError } from "@tauri-apps/plugin-log";

// Proton versions options
const protonVersions = [
  { value: "ge-proton-8-32", label: "GE-Proton 8-32" },
  { value: "ge-proton-8-31", label: "GE-Proton 8-31" },
  { value: "ge-proton-8-30", label: "GE-Proton 8-30" },
  { value: "proton-experimental", label: "Proton Experimental" },
];

// Settings state
const protonVersion = ref("ge-proton-8-32");
const mangoHudEnabled = ref(false);

// Focus state for gamepad navigation
const focusedIndex = ref(0); // 0 = Proton Select, 1 = MangoHud Toggle

const { on: onGamepad } = useGamepad();

async function loadSettings() {
  try {
    const settings = await api.getSettings();
    protonVersion.value = settings.protonVersion;
    mangoHudEnabled.value = settings.mangoHudEnabled;
  } catch (error) {
    await logError(`Failed to load settings: ${error}`);
  }
}

async function updateProtonVersion(version: string) {
  protonVersion.value = version;
  try {
    // TODO: Implement updateSettings API
    await info(`Proton version updated to: ${version}`);
  } catch (error) {
    await logError(`Failed to update Proton version: ${error}`);
  }
}

async function updateMangoHud(enabled: boolean) {
  mangoHudEnabled.value = enabled;
  try {
    // TODO: Implement updateSettings API
    await info(`MangoHud updated to: ${enabled}`);
  } catch (error) {
    await logError(`Failed to update MangoHud setting: ${error}`);
  }
}

onMounted(() => {
  loadSettings();

  // Gamepad navigation
  onGamepad("navigate", ({ direction }: { direction: string }) => {
    // Up/Down navigation between settings
    if (direction === "up" && focusedIndex.value > 0) {
      focusedIndex.value--;
    } else if (direction === "down" && focusedIndex.value < 1) {
      focusedIndex.value++;
    }
  });

  // For now, users must click/tap to change values
  // Implementing full gamepad control for Select/Toggle requires more work
});
</script>
