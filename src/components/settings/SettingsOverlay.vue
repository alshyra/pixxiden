<template>
  <!-- Full screen overlay -->
  <Transition name="overlay-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      @click.self="close"
    >
      <!-- Settings Menu Card -->
      <div class="w-full max-w-2xl mx-4 animate-slide-up">
        <!-- Header -->
        <div class="mb-8 text-center">
          <h1 class="text-5xl font-black text-white italic tracking-tight mb-2">
            Paramètres
          </h1>
          <p class="text-white/50 text-sm">Utilisez ↑↓ pour naviguer, A pour sélectionner</p>
        </div>

        <!-- Menu Items -->
        <div class="bg-[#0f0f12]/95 border border-white/10 rounded-2xl p-2 backdrop-blur-md">
          <button
            v-for="(section, index) in sections"
            :key="section.id"
            class="w-full text-left px-6 py-4 rounded-xl transition-all duration-150"
            :class="{
              'bg-[#5e5ce6] text-white shadow-[0_0_20px_rgba(94,92,230,0.5)]': focusedIndex === index,
              'text-white/70 hover:bg-white/5': focusedIndex !== index,
            }"
            @click="selectSection(section)"
            @mouseenter="focusedIndex = index"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <component
                  :is="section.icon"
                  class="w-5 h-5"
                  :class="focusedIndex === index ? 'text-white' : 'text-white/50'"
                />
                <div>
                  <div class="font-bold text-base">{{ section.label }}</div>
                  <div
                    class="text-xs mt-0.5"
                    :class="focusedIndex === index ? 'text-white/80' : 'text-white/40'"
                  >
                    {{ section.description }}
                  </div>
                </div>
              </div>
              <ChevronRight
                class="w-5 h-5 transition-transform"
                :class="{
                  'text-white translate-x-1': focusedIndex === index,
                  'text-white/30': focusedIndex !== index,
                }"
              />
            </div>
          </button>

          <!-- Power Button -->
          <div class="border-t border-white/10 mt-2 pt-2">
            <button
              class="w-full text-left px-6 py-4 rounded-xl transition-all duration-150"
              :class="{
                'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]':
                  focusedIndex === sections.length,
                'text-red-400 hover:bg-red-600/10': focusedIndex !== sections.length,
              }"
              @click="emit('openPowerMenu')"
              @mouseenter="focusedIndex = sections.length"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <Power class="w-5 h-5" />
                  <div>
                    <div class="font-bold text-base">Éteindre</div>
                    <div
                      class="text-xs mt-0.5"
                      :class="focusedIndex === sections.length ? 'text-white/80' : 'text-red-300/60'"
                    >
                      Éteindre le système ou quitter l'application
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer Hint -->
        <div class="mt-6 text-center text-white/40 text-xs">
          <kbd class="px-2 py-1 bg-white/10 rounded">B</kbd>
          pour fermer
        </div>
      </div>

      <!-- Content View (if section selected) -->
      <Transition name="content-slide">
        <div
          v-if="selectedSection"
          class="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex items-center justify-center"
          @click.self="selectedSection = null"
        >
          <div class="w-full max-w-4xl h-[80vh] mx-4 bg-[#0f0f12]/98 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <!-- Content Header -->
            <div class="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white">{{ selectedSection.label }}</h2>
                <p class="text-white/50 text-sm mt-1">{{ selectedSection.description }}</p>
              </div>
              <button
                class="p-3 hover:bg-white/10 rounded-xl transition-colors"
                @click="selectedSection = null"
              >
                <X class="w-6 h-6 text-white/70" />
              </button>
            </div>

            <!-- Content Body -->
            <div class="flex-1 overflow-y-auto p-8">
              <component :is="selectedSection.component" />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { Power, ChevronRight, X, Monitor, Store, Key, Settings } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";
import SettingsSystem from "@/components/settings/system/SettingsSystem.vue";
import SettingsStore from "@/components/settings/store/SettingsStore.vue";
import SettingsApiKeys from "@/components/settings/advanced/SettingsApiKeys.vue";
import SettingsAdvanced from "@/components/settings/advanced/SettingsAdvanced.vue";

interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: any;
  component: any;
}

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  openPowerMenu: [];
}>();

const sections: SettingsSection[] = [
  {
    id: "system",
    label: "Système",
    description: "Informations système et synchronisation",
    icon: Monitor,
    component: SettingsSystem,
  },
  {
    id: "store",
    label: "Comptes",
    description: "Gérer les connexions aux stores",
    icon: Store,
    component: SettingsStore,
  },
  {
    id: "api-keys",
    label: "Clés API",
    description: "Configuration IGDB et SteamGridDB",
    icon: Key,
    component: SettingsApiKeys,
  },
  {
    id: "advanced",
    label: "Avancé",
    description: "Proton et paramètres experts",
    icon: Settings,
    component: SettingsAdvanced,
  },
];

const focusedIndex = ref(0);
const selectedSection = ref<SettingsSection | null>(null);

const { on: onGamepad } = useGamepad();

// Reset focus when overlay opens
watch(() => props.show, (show) => {
  if (show) {
    focusedIndex.value = 0;
    selectedSection.value = null;
  }
});

function close() {
  if (selectedSection.value) {
    selectedSection.value = null;
    return;
  }
  emit("close");
}

function selectSection(section: SettingsSection) {
  selectedSection.value = section;
}

// Gamepad navigation
const handleNavigate = ({ direction }: { direction: string }) => {
  if (selectedSection.value) return; // Don't navigate menu when content is open

  const maxIndex = sections.length; // +1 for power button

  if (direction === "up" && focusedIndex.value > 0) {
    focusedIndex.value--;
  } else if (direction === "down" && focusedIndex.value < maxIndex) {
    focusedIndex.value++;
  }
};

const handleConfirm = () => {
  if (selectedSection.value) return; // Content handles its own confirm

  if (focusedIndex.value === sections.length) {
    // Power button
    emit("openPowerMenu");
  } else {
    // Select section
    selectSection(sections[focusedIndex.value]);
  }
};

const handleBack = () => {
  if (selectedSection.value) {
    selectedSection.value = null;
  } else {
    emit("close");
  }
};

onMounted(() => {
  onGamepad("navigate", handleNavigate);
  onGamepad("confirm", handleConfirm);
  onGamepad("back", handleBack);
});
</script>

<style scoped>
/* Overlay fade animation */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* Slide up animation for menu */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Content slide animation */
.content-slide-enter-active,
.content-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.content-slide-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.content-slide-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

/* Custom scrollbar for content */
:deep(*::-webkit-scrollbar) {
  width: 8px;
}

:deep(*::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(*::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

:deep(*::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.2);
}
</style>
