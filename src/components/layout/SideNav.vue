<template>
  <!-- Backdrop -->
  <Transition name="backdrop-fade">
    <div
      v-if="sideNavStore.isOpen"
      class="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
      @click="sideNavStore.close()"
    />
  </Transition>

  <!-- Side Nav -->
  <Transition name="slide-from-left">
    <nav
      v-if="sideNavStore.isOpen"
      class="fixed left-0 top-0 bottom-0 w-[320px] z-50 bg-[#0f0f12] backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl"
    >
      <!-- Header -->
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <PixxidenLogo :size="40" :glow="true" />
          <div>
            <h2 class="text-xl font-black text-white italic">Pixxiden</h2>
            <p class="text-xs text-white/40">v0.1.0-alpha</p>
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="flex-1 overflow-y-auto py-4">
        <button
          v-for="(item, index) in menuItems"
          :key="item.id"
          class="w-full px-6 py-4 flex items-center gap-4 transition-all duration-150 group"
          :class="{
            'bg-[#5e5ce6] shadow-[0_0_20px_rgba(94,92,230,0.5)]': focusedIndex === index,
            'hover:bg-white/5': focusedIndex !== index,
          }"
          @click="navigateTo(item.route)"
          @mouseenter="focusedIndex = index"
        >
          <component
            :is="item.icon"
            class="w-6 h-6 transition-colors"
            :class="{
              'text-white': focusedIndex === index,
              'text-white/50 group-hover:text-white/70': focusedIndex !== index,
            }"
          />
          <div class="flex-1 text-left">
            <div
              class="font-bold text-base transition-colors"
              :class="{
                'text-white': focusedIndex === index,
                'text-white/70 group-hover:text-white': focusedIndex !== index,
              }"
            >
              {{ item.label }}
            </div>
            <div
              class="text-xs mt-0.5 transition-colors"
              :class="{
                'text-white/80': focusedIndex === index,
                'text-white/40 group-hover:text-white/60': focusedIndex !== index,
              }"
            >
              {{ item.description }}
            </div>
          </div>
          <ChevronRight
            v-if="focusedIndex === index"
            class="w-5 h-5 text-white"
          />
        </button>
      </div>

      <!-- Footer: Power Menu -->
      <div class="border-t border-white/10 p-4">
        <button
          class="w-full px-6 py-4 flex items-center gap-4 rounded-xl transition-all duration-150 group"
          :class="{
            'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]': focusedIndex === menuItems.length,
            'hover:bg-red-600/10': focusedIndex !== menuItems.length,
          }"
          @click="emit('openPowerMenu')"
          @mouseenter="focusedIndex = menuItems.length"
        >
          <Power
            class="w-6 h-6"
            :class="{
              'text-white': focusedIndex === menuItems.length,
              'text-red-400': focusedIndex !== menuItems.length,
            }"
          />
          <div class="flex-1 text-left">
            <div
              class="font-bold text-base"
              :class="{
                'text-white': focusedIndex === menuItems.length,
                'text-red-400 group-hover:text-red-300': focusedIndex !== menuItems.length,
              }"
            >
              Éteindre
            </div>
            <div
              class="text-xs mt-0.5"
              :class="{
                'text-white/80': focusedIndex === menuItems.length,
                'text-red-300/60 group-hover:text-red-300/80': focusedIndex !== menuItems.length,
              }"
            >
              Options d'alimentation
            </div>
          </div>
        </button>
      </div>
    </nav>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useSideNavStore } from "@/stores/sideNav";
import { useGamepad } from "@/composables/useGamepad";
import { PixxidenLogo } from "@/components/ui";
import { Library, Download, Store, Monitor, Power, ChevronRight } from "lucide-vue-next";

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  route: string;
}

const emit = defineEmits<{
  openPowerMenu: [];
}>();

const router = useRouter();
const route = useRoute();
const sideNavStore = useSideNavStore();
const { on: onGamepad } = useGamepad();

const menuItems: MenuItem[] = [
  {
    id: "library",
    label: "Bibliothèque",
    description: "Tous vos jeux",
    icon: Library,
    route: "/",
  },
  {
    id: "downloads",
    label: "Téléchargements",
    description: "Installations en cours",
    icon: Download,
    route: "/downloads",
  },
  {
    id: "accounts",
    label: "Comptes",
    description: "Gérer les connexions",
    icon: Store,
    route: "/accounts",
  },
  {
    id: "system",
    label: "Système",
    description: "Paramètres et configuration",
    icon: Monitor,
    route: "/system",
  },
];

const focusedIndex = ref(0);

// Reset focus when side nav opens
watch(() => sideNavStore.isOpen, (open) => {
  if (open) {
    // Focus current route or first item
    const currentIndex = menuItems.findIndex((item) => isActive(item.route));
    focusedIndex.value = currentIndex >= 0 ? currentIndex : 0;
  }
});

function isActive(routePath: string): boolean {
  return route.path === routePath;
}

function navigateTo(routePath: string) {
  router.push(routePath);
  sideNavStore.close();
}

// Gamepad navigation
onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (!sideNavStore.isOpen) return;

  const maxIndex = menuItems.length; // +1 for power button

  if (direction === "up" && focusedIndex.value > 0) {
    focusedIndex.value--;
  } else if (direction === "down" && focusedIndex.value < maxIndex) {
    focusedIndex.value++;
  }
});

onGamepad("confirm", () => {
  if (!sideNavStore.isOpen) return;

  if (focusedIndex.value === menuItems.length) {
    // Power button
    emit("openPowerMenu");
  } else {
    // Navigate to selected route
    const item = menuItems[focusedIndex.value];
    navigateTo(item.route);
  }
});

onGamepad("back", () => {
  if (sideNavStore.isOpen) {
    sideNavStore.close();
  }
});
</script>

<style scoped>
/* Backdrop fade */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.3s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

/* Slide from left */
.slide-from-left-enter-active,
.slide-from-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-from-left-enter-from,
.slide-from-left-leave-to {
  transform: translateX(-100%);
}

/* Custom scrollbar */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
