<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <h2
        class="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      >
        Avancé
      </h2>
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
        >
          <Select
            :model-value="protonVersion"
            :options="protonVersions"
            placeholder="Sélectionner une version"
            @update:model-value="(val) => $emit('update:protonVersion', String(val))"
          />
        </SettingsRow>

        <!-- MangoHud Overlay -->
        <SettingsRow
          title="MangoHud Overlay"
          description="Affiche FPS, températures et utilisation matérielle."
          :divider="false"
        >
          <Toggle
            :model-value="mangoHudEnabled"
            @update:model-value="$emit('update:mangoHudEnabled', $event)"
          />
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
import * as api from "@/services/api";

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

async function loadSettings() {
  try {
    const settings = await api.getSettings();
    protonVersion.value = settings.protonVersion;
    mangoHudEnabled.value = settings.mangoHudEnabled;
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

onMounted(() => loadSettings())
</script>
