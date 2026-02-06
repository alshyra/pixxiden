<template>
  <Modal :model-value="show" @update:model-value="handleClose" :title="'Connexion Epic Games'"
    :close-on-backdrop="false" size="md">
    <div class="space-y-6 min-h-[200px]">
      <Transition name="fade" mode="out-in">
        <!-- Initial Instructions State -->
        <div v-if="!loading && !success" key="instructions" class="space-y-4">
          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-white mb-2">📋 Instructions</h3>
            <ol class="text-sm text-white/70 space-y-2 list-decimal list-inside">
              <li>Cliquez sur le bouton ci-dessous pour ouvrir votre navigateur</li>
              <li>Connectez-vous avec vos identifiants Epic Games</li>
              <li>Copiez le code d'autorisation (authorizationCode) affiché</li>
              <li>Collez-le dans le champ ci-dessous</li>
            </ol>
          </div>

          <div class="space-y-3">
            <Button variant="primary" class="w-full" @click="openBrowser" :disabled="loading">
              🌐 Ouvrir le navigateur
            </Button>

            <div class="space-y-2">
              <label class="text-sm font-medium text-white/80">Code d'autorisation</label>
              <input v-model="authCode" type="text" placeholder="Collez le code ici..."
                class="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                @keydown.enter="submitCode" />
            </div>

            <Button variant="primary" class="w-full" @click="submitCode" :disabled="!authCode.trim() || loading">
              Valider
            </Button>
          </div>

          <div v-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p class="text-red-400 text-sm">{{ error }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" key="loading" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p class="text-lg font-semibold text-white mb-2">🔐 Authentification en cours...</p>
          <p class="text-sm text-white/60">Veuillez patienter...</p>
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
import { open } from "@tauri-apps/plugin-shell";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import { getAuthService } from "@/services";

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
const authCode = ref("");
const authUrl = ref("");

const handleClose = () => {
  if (!loading.value) {
    // Reset state
    authCode.value = "";
    error.value = null;
    success.value = false;
    emit("close");
  }
};

watch(
  () => props.show,
  async (newShow) => {
    if (newShow) {
      // Reset state
      authCode.value = "";
      error.value = null;
      success.value = false;

      // Get auth URL
      try {
        const auth = getAuthService();
        authUrl.value = await auth.startEpicAuth();
      } catch (err: any) {
        error.value = "Failed to get authentication URL";
        console.error("[EpicAuthModal] Error getting auth URL:", err);
      }
    }
  },
);

const openBrowser = async () => {
  try {
    await open(authUrl.value);
    console.log("[EpicAuthModal] Opened browser with URL:", authUrl.value);
  } catch (err: any) {
    error.value = "Impossible d'ouvrir le navigateur. Veuillez ouvrir manuellement l'URL: " + authUrl.value;
    console.error("[EpicAuthModal] Failed to open browser:", err);
  }
};

const submitCode = async () => {
  if (!authCode.value.trim()) {
    error.value = "Veuillez entrer le code d'autorisation";
    return;
  }

  loading.value = true;
  error.value = null;

  console.log("[EpicAuthModal] Submitting authorization code...");

  try {
    // 1. Complete Epic authentication with the code
    console.log("[EpicAuthModal] Authenticating with Legendary...");
    const auth = getAuthService();
    await auth.completeEpicAuth(authCode.value.trim());

    // 2. Update auth store
    console.log("[EpicAuthModal] Updating auth store...");
    await authStore.fetchAuthStatus();

    // 3. Fetch games library - this triggers sync and loads new games
    console.log("[EpicAuthModal] Fetching games...");
    await libraryStore.fetchGames();

    // 4. Show success
    success.value = true;
    emit("success");

    console.log("[EpicAuthModal] Authentication successful!");

    // Auto-close after success
    setTimeout(() => {
      handleClose();
    }, 2000);
  } catch (err: any) {
    error.value = err.message || "Échec de l'authentification. Veuillez vérifier le code et réessayer.";
    console.error("[EpicAuthModal] Authentication error:", err);
  } finally {
    loading.value = false;
  }
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
