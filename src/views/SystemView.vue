<template>
  <div
    ref="scrollContainer"
    class="h-screen bg-[#050505] text-white overflow-y-auto pb-24"
  >
    <div class="max-w-5xl mx-auto px-8 py-8 space-y-10">
      <!-- Header -->
      <header>
        <h1 class="text-5xl font-black italic tracking-tight mb-2">Système</h1>
        <p class="text-white/50 text-lg">Configuration et paramètres avancés</p>
      </header>

      <!-- System Info & Library Sync -->
      <SettingsSystem />

      <!-- Divider -->
      <div class="border-t border-white/10" />

      <!-- Advanced Settings (Proton, MangoHud) -->
      <SettingsAdvanced />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useGamepad } from "@/composables/useGamepad";
import { useGamepadScroll } from "@/composables/useGamepadScroll";
import { useSideNavStore } from "@/stores/sideNav";
import SettingsSystem from "@/components/settings/system/SettingsSystem.vue";
import SettingsAdvanced from "@/components/settings/advanced/SettingsAdvanced.vue";

const router = useRouter();
const sideNavStore = useSideNavStore();
const { on: onGamepad } = useGamepad();

// Right-stick scroll
const scrollContainer = ref<HTMLElement | null>(null);
useGamepadScroll(scrollContainer);

// B button → go back (guarded against SideNav being open)
onGamepad("back", () => {
  if (sideNavStore.isOpen) return;
  router.back();
});
</script>
