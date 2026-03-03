<template>
  <div
    ref="scrollContainer"
    data-testid="accounts-view"
    class="h-screen bg-[#050505] text-white overflow-y-auto pb-24"
  >
    <div class="max-w-5xl mx-auto px-8 py-8 space-y-10">
      <!-- Header -->
      <header>
        <h1 class="text-5xl font-black italic tracking-tight mb-2">Comptes</h1>
        <p class="text-white/50 text-lg">Gérer vos connexions et clés API</p>
      </header>

      <!-- Store Accounts -->
      <section>
        <h2 class="text-2xl font-bold mb-6">Connexions aux Stores</h2>
        <SettingsStore />
      </section>

      <!-- API Keys -->
      <section>
        <h2 class="text-2xl font-bold mb-6">Clés API</h2>
        <SettingsApiKeys />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useGamepad } from "@/composables/useGamepad";
import { useGamepadScroll } from "@/composables/useGamepadScroll";
import { useSideNavStore } from "@/stores/sideNav";
import SettingsStore from "@/components/settings/store/SettingsStore.vue";
import SettingsApiKeys from "@/components/settings/advanced/SettingsApiKeys.vue";

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
