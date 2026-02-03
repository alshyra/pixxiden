<template>
  <Modal :model-value="show" @update:model-value="handleClose" :title="'Connexion Epic Games'" size="md">
    <div class="space-y-6 min-h-[200px] flex items-center justify-center">
      <Transition name="fade" mode="out-in">
        <!-- Loading State -->
        <div v-if="loading" key="loading" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p class="text-lg font-semibold text-white mb-2">🌐 Ouverture du navigateur...</p>
          <p class="text-sm text-white/60">
            Une fenêtre Epic Games va s'ouvrir. Connectez-vous avec vos identifiants.
          </p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" key="error" class="text-center py-8">
          <div class="text-5xl mb-4">❌</div>
          <p class="text-red-400 mb-4">{{ error }}</p>
          <Button variant="primary" @click="retry"> Réessayer </Button>
        </div>

        <!-- Success State -->
        <div v-else-if="success" key="success" class="text-center py-8">
          <div class="text-6xl mb-4 animate-bounce">✓</div>
          <p class="text-lg font-semibold text-green-400">Epic Games connecté avec succès!</p>
          <p class="text-sm text-white/60 mt-2">Synchronisation de la bibliothèque...</p>
        </div>
      </Transition>
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose" :disabled="loading">
        {{ success ? "Fermer" : "Annuler" }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useLibraryStore } from "@/stores/library";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import { EpicWebviewHandler } from "@/services/auth/EpicWebviewHandler";
import { LegendaryService } from "@/services/stores/LegendaryService";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const authStore = useAuthStore();
const libraryStore = useLibraryStore();

const loading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const handleClose = () => {
  if (!loading.value) {
    emit("close");
  }
};

watch(
  () => props.show,
  async (newShow) => {
    if (newShow) {
      // Reset state
      error.value = null;
      success.value = false;

      // Start authentication
      await startAuth();
    }
  },
);

const startAuth = async () => {
  loading.value = true;
  error.value = null;

  console.log("[EpicAuthModal] Starting authentication flow...");

  try {
    // 1. Open webview and get authorization code from Epic OAuth
    console.log("[EpicAuthModal] Calling EpicWebviewHandler.authenticate()...");
    const authResult = await EpicWebviewHandler.authenticate();
    console.log("[EpicAuthModal] Authentication result:", authResult);

    if (!authResult.succeeded) {
      throw new Error("Authentication cancelled");
    }

    // 2. Send authorization code to legendary
    console.log("[EpicAuthModal] Authenticating with Legendary...");
    const legendaryService = new LegendaryService();
    await legendaryService.authenticate(authResult.authorizationCode);

    // 3. Update auth store
    console.log("[EpicAuthModal] Updating auth store...");
    authStore.setStoreAuthenticated("epic", true);

    // 4. Fetch games library - this triggers sync and loads new games
    console.log("[EpicAuthModal] Fetching games...");
    await libraryStore.fetchGames();

    // 5. Show success
    success.value = true;
    emit("success");

    console.log("[EpicAuthModal] Authentication successful!");

    // Auto-close after success
    setTimeout(() => {
      emit("close");
    }, 2000);
  } catch (err: any) {
    error.value = err.message || "Authentication failed. Please try again.";
    console.error("[EpicAuthModal] Authentication error:", err);
  } finally {
    loading.value = false;
  }
};

const retry = async () => {
  await startAuth();
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
