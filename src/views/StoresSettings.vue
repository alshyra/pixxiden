<template>
  <div
    class="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] p-10"
    data-testid="settings-view"
  >
    <div class="mb-10">
      <Button variant="outline" class="mb-6 group" @click="handleBack">
        <span class="text-xl font-bold mr-2 transition-transform group-hover:-translate-x-1"
          >←</span
        >
        Retour
      </Button>
      <h1 class="text-4xl font-bold text-white mb-3">Configuration des Stores</h1>
      <p class="text-base text-white/60 leading-relaxed">
        Connectez vos comptes Epic Games, GOG et Amazon Games pour accéder à vos bibliothèques.
      </p>
    </div>

    <div v-if="authStore.loading" class="flex flex-col items-center justify-center py-16">
      <div
        class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-5"
      ></div>
      <p class="text-white/70">Chargement des informations d'authentification...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
      <StoreCard
        v-for="store in stores"
        :key="store"
        :store="store"
        :status="authStore.getStoreStatus(store)"
        :loading="currentAction === store"
        :is-focused="focusedStore === store"
        :data-testid="`store-card-${store}`"
        @connect="handleConnect"
        @disconnect="handleDisconnect"
      />
    </div>

    <!-- Modals -->
    <EpicAuthModal
      :show="showEpicModal"
      @close="showEpicModal = false"
      @success="handleAuthSuccess"
      data-testid="epic-auth-modal"
    />

    <GOGAuthModal
      :show="showGOGModal"
      @close="showGOGModal = false"
      @success="handleAuthSuccess"
      data-testid="gog-auth-modal"
    />

    <AmazonAuthModal
      :show="showAmazonModal"
      @close="showAmazonModal = false"
      @success="handleAuthSuccess"
      data-testid="amazon-auth-modal"
    />

    <!-- Confirmation Modal for Logout -->
    <Modal
      v-model="showLogoutConfirm"
      :title="'Confirmer la déconnexion'"
      size="sm"
      data-testid="logout-confirm-modal"
    >
      <p class="text-white/80 text-center py-4">
        Êtes-vous sûr de vouloir vous déconnecter de {{ getStoreName(storeToLogout) }} ?
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="cancelLogout">Annuler</Button>
          <Button variant="danger" @click="confirmLogout">Se déconnecter</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useFocusNavigation } from "@/composables/useFocusNavigation";
import type { StoreType } from "@/types";
import StoreCard from "@/components/settings/store/StoreCard.vue";
import EpicAuthModal from "@/components/settings/storeModal/EpicAuthModal.vue";
import GOGAuthModal from "@/components/settings/storeModal/GOGAuthModal.vue";
import AmazonAuthModal from "@/components/settings/storeModal/AmazonAuthModal.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";

const router = useRouter();
const authStore = useAuthStore();

const stores = ref<StoreType[]>(["epic", "gog", "amazon", "steam"]);
const currentAction = ref<StoreType | null>(null);

const showEpicModal = ref(false);
const showGOGModal = ref(false);
const showAmazonModal = ref(false);

const showLogoutConfirm = ref(false);
const storeToLogout = ref<StoreType | null>(null);

// Gamepad navigation
const { focusedIndex } = useFocusNavigation('[data-testid^="store-card"]', {
  gridColumns: 2,
  wrapNavigation: true,
  autoScroll: true,
});

// Sync focused store with navigation
const focusedStore = ref<StoreType | null>(null);
watch(focusedIndex, (newIndex) => {
  focusedStore.value = stores.value[newIndex] || null;
});

onMounted(async () => {
  await authStore.fetchAuthStatus();
});

const handleBack = () => {
  router.push("/settings");
};

const handleConnect = (store: StoreType) => {
  currentAction.value = store;

  switch (store) {
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
      // Steam doesn't require authentication
      break;
  }

  currentAction.value = null;
};

const handleDisconnect = (store: StoreType) => {
  storeToLogout.value = store;
  showLogoutConfirm.value = true;
};

const confirmLogout = async () => {
  if (!storeToLogout.value) return;

  currentAction.value = storeToLogout.value;

  try {
    await authStore.logout(storeToLogout.value);
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    currentAction.value = null;
    showLogoutConfirm.value = false;
    storeToLogout.value = null;
  }
};

const cancelLogout = () => {
  showLogoutConfirm.value = false;
  storeToLogout.value = null;
};

const handleAuthSuccess = async () => {
  // Refresh library after successful auth
  // This could trigger a re-sync of games
  console.log("Auth success - library should be refreshed");
};

const getStoreName = (store: StoreType | null): string => {
  if (!store) return "";
  const names: Record<StoreType, string> = {
    epic: "Epic Games",
    gog: "GOG",
    amazon: "Amazon Games",
    steam: "Steam",
  };
  return names[store];
};
</script>
