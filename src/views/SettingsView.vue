<template>
  <div class="fixed inset-0 flex gap-6 p-6 pb-20 z-50 bg-black/85 backdrop-blur-lg">
    <!-- Sidebar -->
    <SettingsSidebar :focused="focusZone === 'sidebar'" :focused-index="focusedMenuIndex" version="v0.1.0-alpha" />

    <!-- Main Content -->
    <main class="flex-1 bg-[#141419]/95 border border-white/10 rounded-[10px] p-8 overflow-y-auto"
      :class="{ 'ring-2 ring-[#5e5ce6]': focusZone === 'content' }">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { SettingsSidebar } from "@/components/settings";
import { useGamepad } from "@/composables/useGamepad";
import { onKeyStroke } from "@vueuse/core";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { on: onGamepad } = useGamepad();

// Navigation state
const focusZone = ref<"sidebar" | "content">("sidebar");
const focusedMenuIndex = ref(0);

// Close settings
function closeSettings() {
  router.push("/");
}

// Keyboard handler
onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => {
  closeSettings();
});

// Navigation in settings sections with gamepad
function navigateSidebar(direction: "up" | "down") {
  const sections = [
    { id: "system", label: "Système" },
    { id: "store", label: "Magasins" },
    { id: "api-keys", label: "Clés API" },
    { id: "advanced", label: "Avancé" },
  ];
  const maxIndex = sections.length - 1;

  if (direction === "up" && focusedMenuIndex.value > 0) {
    focusedMenuIndex.value--;
  } else if (direction === "down" && focusedMenuIndex.value < maxIndex) {
    focusedMenuIndex.value++;
  }
}

// Gamepad handlers
onGamepad("back", () => {
  if (focusZone.value === "content") {
    // Return to sidebar from content
    focusZone.value = "sidebar";
  } else {
    // Close settings
    closeSettings();
  }
});

onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (focusZone.value === "sidebar") {
    if (direction === "up" || direction === "down") {
      navigateSidebar(direction as "up" | "down");
    }
  }
  // Content navigation is handled by child components
});

onGamepad("confirm", () => {
  if (focusZone.value === "sidebar") {
    const sections = [
      { id: "system", label: "Système" },
      { id: "store", label: "Magasins" },
      { id: "api-keys", label: "Clés API" },
      { id: "advanced", label: "Avancé" },
    ];
    // Select the focused menu item
    const section = sections[focusedMenuIndex.value];
    if (section) {
      router.push(`/settings/${section.id}`);
      focusZone.value = "content";
    }
  }
});


</script>

<style scoped>
/* Animation fade-in */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease;
}

/* Custom scrollbar */
main::-webkit-scrollbar {
  width: 6px;
}

main::-webkit-scrollbar-track {
  background: transparent;
}

main::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

main::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive */
@media (max-width: 1024px) {
  .fixed {
    flex-direction: column;
    padding: 1rem;
  }

  aside {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }

  nav {
    flex-direction: row;
    flex: unset;
    gap: 0.5rem;
  }

  .text-\[0\.7rem\] {
    display: none;
  }

  .version-badge {
    display: none;
  }

  .close-button {
    margin-left: auto;
  }

  .text-\[3\.5rem\] {
    font-size: 2.5rem;
  }

  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>