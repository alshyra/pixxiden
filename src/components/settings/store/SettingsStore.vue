<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <h2
        class="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        Comptes
      </h2>
      <p class="text-gray-500 text-lg italic font-medium">
        Connectez vos stores pour synchroniser votre bibliothèque.
      </p>
    </header>

    <!-- Loading State -->
    <div v-if="loading"
      class="flex items-center justify-center gap-4 p-12 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[10px]">
      <div class="w-6 h-6 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin" />
      <span class="text-white/50">Chargement des stores...</span>
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- Store Cards -->
      <Card v-for="(store, index) in stores" :key="store.id" variant="glass" class="!p-5"
        :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === index }" :data-focusable="index" noPadding>
        <!-- Wrapper flex horizontal avec space-between -->
        <div class="flex items-center justify-between w-full">
          <!-- Left side: Icon + Info -->
          <div class="flex items-center gap-4">
            <!-- Store Icon -->
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(94,92,230,0.4)]"
              :class="storeIconClass(store.id)">
              {{ store.name.substring(0, 2).toUpperCase() }}
            </div>

            <!-- Store Info -->
            <div>
              <h3 class="text-base font-bold text-white">{{ store.name }}</h3>
              <p class="text-xs font-semibold mt-0.5" :class="storeStatusClass(store)">
                {{ storeStatusText(store) }}
              </p>
            </div>
          </div>

          <!-- Right side: Button -->
          <Button :variant="store.authenticated ? 'outline' : 'primary'" size="sm" @click="toggleConnection(store)">
            {{ store.authenticated ? "DÉCONNEXION" : "CONNEXION" }}
          </Button>
        </div>
      </Card>

      <!-- Info message -->
      <div
        class="flex items-center gap-3 p-4 bg-[#5e5ce6]/10 border border-[#5e5ce6]/20 rounded-xl text-[0.85rem] text-white/70">
        <Info class="w-5 h-5 flex-shrink-0" />
        <span>La connexion aux stores utilise les outils Legendary, GOGdl et Nile.</span>
      </div>
    </div>

    <!-- Modals -->
    <EpicAuthModal :show="showEpicModal" @close="showEpicModal = false" @success="handleAuthSuccess" />

    <GOGAuthModal :show="showGOGModal" @close="showGOGModal = false" @success="handleAuthSuccess" />

    <AmazonAuthModal :show="showAmazonModal" @close="showAmazonModal = false" @success="handleAuthSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Card, Button } from "@/components/ui";
import { Info } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";
import { useLibraryStore } from "@/stores/library";
import * as api from "@/services/api";
import EpicAuthModal from "./EpicAuthModal.vue";
import GOGAuthModal from "./GOGAuthModal.vue";
import AmazonAuthModal from "./AmazonAuthModal.vue";

export interface StoreAccount {
  id: string;
  name: string;
  available: boolean;
  authenticated: boolean;
  username?: string;
}

const { on: onGamepad } = useGamepad();
const focusedIndex = ref(0);
const libraryStore = useLibraryStore();
const loading = ref(false);

// Modal states
const showEpicModal = ref(false);
const showGOGModal = ref(false);
const showAmazonModal = ref(false);

// State local au composant
const stores = ref<StoreAccount[]>([
  { id: "epic", name: "Epic Games", available: false, authenticated: false, username: "" },
  { id: "gog", name: "GOG Galaxy", available: false, authenticated: false, username: "" },
  { id: "amazon", name: "Amazon Games", available: false, authenticated: false, username: "" },
  { id: "steam", name: "Steam", available: false, authenticated: false, username: "" },
]);

// Load store status
async function loadStoreStatus() {
  loading.value = true;
  try {
    stores.value = await api.getStoreStatus();
    console.log("🏪 Store status loaded:", stores.value);
  } catch (error) {
    console.error("Failed to load store status:", error);
  } finally {
    loading.value = false;
  }
}

// Toggle store connection
function toggleConnection(store: StoreAccount) {
  console.log("Toggle connection for:", store.name);

  // If already authenticated, handle disconnection
  if (store.authenticated) {
    // TODO: Implement disconnection logic
    console.warn("Disconnection not implemented yet for:", store.id);
    return;
  }

  // Open authentication modal
  switch (store.id) {
    case "epic":
      showEpicModal.value = true;
      break;
    case "gog":
      showGOGModal.value = true;
      break;
    case "amazon":
      showAmazonModal.value = true;
      break;
    case "steam":
      // Steam doesn't require authentication modal
      console.info("Steam connection not implemented");
      break;
    default:
      console.warn("Unknown store ID:", store.id);
  }
}

// Handle successful authentication
async function handleAuthSuccess() {
  console.log("🎉 Authentication successful, refreshing store status...");
  await loadStoreStatus();
  await libraryStore.fetchGames();
}

function storeIconClass(storeId: string): string {
  const classes: Record<string, string> = {
    steam: "bg-[#1b2838]",
    epic: "bg-[#2a2a2a]",
    gog: "bg-[#722ed1]",
    amazon: "bg-[#ff9900] text-black",
  };
  return classes[storeId] || "bg-[#5e5ce6] text-white";
}

function storeStatusClass(store: StoreAccount): string {
  if (store.authenticated) return "text-green-500";
  if (store.available) return "text-yellow-500";
  return "text-white/40";
}

function storeStatusText(store: StoreAccount): string {
  if (store.authenticated) {
    return `CONNECTÉ${store.username ? " — " + store.username : ""}`;
  }
  if (store.available) return "DÉTECTÉ — NON CONNECTÉ";
  return "NON DÉTECTÉ";
}

// Gamepad navigation
const navigateHandler = ({ direction }: { direction: string }) => {
  const maxIndex = stores.value.length - 1;

  if (direction === "up" && focusedIndex.value > 0) {
    focusedIndex.value--;
  } else if (direction === "down" && focusedIndex.value < maxIndex) {
    focusedIndex.value++;
  }
};

const confirmHandler = () => {
  const store = stores.value[focusedIndex.value];
  if (store) {
    toggleConnection(store);
  }
};

onMounted(async () => {
  // Charger les données au montage
  await loadStoreStatus();

  onGamepad("navigate", navigateHandler);
  onGamepad("confirm", confirmHandler);
});
</script>