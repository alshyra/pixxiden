<template>
  <Modal v-model="show" :title="'Connexion Epic Games'" size="md">
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
          <div
            class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
          ></div>
        </div>
        <p class="text-lg font-semibold text-white mb-2">🌐 Ouverture du navigateur...</p>
        <p class="text-sm text-white/60">
          Connectez-vous dans le navigateur qui vient de s'ouvrir.
        </p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-400 mb-4">❌ {{ error }}</p>
        <Button variant="primary" @click="retry"> Réessayer </Button>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="text-center py-8">
        <p class="text-lg font-semibold text-green-400">✓ Epic Games connecté avec succès!</p>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" @click="show = false" :disabled="loading">
        {{ success ? "Fermer" : "Annuler" }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const authStore = useAuthStore();

const loading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

// Create a computed ref for v-model that syncs with parent
const show = computed({
  get: () => props.show,
  set: (value) => {
    if (!value && !loading.value) {
      emit("close");
    }
  },
});

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

  try {
    await authStore.loginEpic();
    success.value = true;
    emit("success");

    // Auto-close after success
    setTimeout(() => {
      show.value = false;
    }, 2000);
  } catch (err: any) {
    error.value = err.message || "Authentication failed. Please try again.";
  } finally {
    loading.value = false;
  }
};

const retry = async () => {
  await startAuth();
};
</script>
