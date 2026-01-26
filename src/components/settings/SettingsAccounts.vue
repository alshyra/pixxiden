<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <h2
        class="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      >
        Comptes
      </h2>
      <p class="text-gray-500 text-lg italic font-medium">
        Connectez vos stores pour synchroniser votre bibliothèque.
      </p>
    </header>

    <div class="flex flex-col gap-6">
      <!-- Store Cards -->
      <Card
        v-for="(store, index) in stores"
        :key="store.id"
        variant="glass"
        class="flex items-center justify-between !p-5"
        :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === index }"
        :data-focusable="index"
      >
        <div class="flex items-center gap-4">
          <!-- Store Icon -->
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(94,92,230,0.4)]"
            :class="storeIconClass(store.id)"
          >
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

        <Button
          :variant="store.authenticated ? 'outline' : 'primary'"
          size="sm"
          @click="toggleConnection(store)"
        >
          {{ store.authenticated ? "DÉCONNEXION" : "CONNEXION" }}
        </Button>
      </Card>

      <!-- Info message -->
      <div
        class="flex items-center gap-3 p-4 bg-[#5e5ce6]/10 border border-[#5e5ce6]/20 rounded-xl text-[0.85rem] text-white/70"
      >
        <Info class="w-5 h-5 flex-shrink-0" />
        <span>La connexion aux stores utilise les outils Legendary, GOGdl et Nile.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Card, Button } from "@/components/ui";
import { Info } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";

export interface StoreAccount {
  id: string;
  name: string;
  available: boolean;
  authenticated: boolean;
  username?: string;
}

const props = defineProps<{
  stores: StoreAccount[];
}>();

const { on: onGamepad } = useGamepad();
const focusedIndex = ref(0);

// Toggle store connection
function toggleConnection(store: StoreAccount) {
  console.log("Toggle connection for:", store.name);
  // TODO: Implement store connection/disconnection logic
  // This will be implemented when store authentication is ready
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
  const maxIndex = props.stores.length - 1;

  if (direction === "up" && focusedIndex.value > 0) {
    focusedIndex.value--;
  } else if (direction === "down" && focusedIndex.value < maxIndex) {
    focusedIndex.value++;
  }
};

const confirmHandler = () => {
  const store = props.stores[focusedIndex.value];
  if (store) {
    toggleConnection(store);
  }
};

onMounted(() => {
  onGamepad("navigate", navigateHandler);
  onGamepad("confirm", confirmHandler);
});

onUnmounted(() => {
  // Cleanup is handled automatically by useGamepad
});
</script>
