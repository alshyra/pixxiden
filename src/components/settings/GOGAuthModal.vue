<template>
  <Modal v-model="show" :title="'Connexion GOG'" size="md">
    <div class="space-y-6">
      <!-- Opening State -->
      <div v-if="step === 'opening'" class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
          <div
            class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
          ></div>
        </div>
        <p class="text-lg font-semibold text-white">🌐 Ouverture de la page GOG...</p>
      </div>

      <!-- Code Input State -->
      <div v-else-if="step === 'code-input'" class="space-y-4">
        <p class="text-sm text-white/80 text-center leading-relaxed">
          Collez le code d'authentification affiché sur le site GOG :
        </p>
        <Input
          v-model="authCode"
          placeholder="Entrez le code..."
          :disabled="loading"
          :error="error || undefined"
          ref="codeInputRef"
          @keyup.enter="handleSubmit"
          class="font-mono text-center"
        />
      </div>

      <!-- Submitting State -->
      <div v-else-if="step === 'submitting'" class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
          <div
            class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
          ></div>
        </div>
        <p class="text-lg font-semibold text-white">Authentification en cours...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="step === 'success'" class="text-center py-8">
        <p class="text-lg font-semibold text-green-400">✓ GOG connecté avec succès!</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="show = false" :disabled="loading"> Annuler </Button>
        <Button
          v-if="step === 'code-input'"
          variant="primary"
          @click="handleSubmit"
          :disabled="!authCode.trim() || loading"
          :loading="loading"
        >
          Valider
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const authStore = useAuthStore();

type Step = "opening" | "code-input" | "submitting" | "success";

const step = ref<Step>("opening");
const authCode = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const codeInputRef = ref<InstanceType<typeof Input> | null>(null);

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
      step.value = "opening";
      authCode.value = "";
      error.value = null;
      loading.value = false;

      // Get auth URL and open browser
      await openAuthUrl();
    }
  },
);

const openAuthUrl = async () => {
  try {
    const url = await authStore.getGOGAuthUrl();
    await openUrl(url);

    // Switch to code input step
    step.value = "code-input";

    // Focus input after render
    await nextTick();
    codeInputRef.value?.$el?.querySelector("input")?.focus();
  } catch (err: any) {
    error.value = err.message || "Failed to get GOG auth URL";
    step.value = "code-input";
  }
};

const handleSubmit = async () => {
  if (!authCode.value.trim() || loading.value) return;

  loading.value = true;
  error.value = null;
  step.value = "submitting";

  try {
    await authStore.loginGOG(authCode.value.trim());
    step.value = "success";
    emit("success");

    // Auto-close after success
    setTimeout(() => {
      show.value = false;
    }, 2000);
  } catch (err: any) {
    error.value = err.message || "Authentication failed. Please check the code and try again.";
    step.value = "code-input";
  } finally {
    loading.value = false;
  }
};
</script>
