<template>
  <Modal
    v-model="show"
    :title="is2FAStep ? 'Authentification à deux facteurs' : 'Connexion Amazon Games'"
    size="md"
  >
    <div class="space-y-6 min-h-[250px] flex items-center justify-center">
      <Transition name="fade" mode="out-in">
        <!-- Login Form -->
        <div v-if="!is2FAStep && !success && !loading" key="login-form" class="space-y-4 w-full">
          <Input
            v-model="email"
            type="email"
            label="Email"
            placeholder="votre@email.com"
            :disabled="loading"
            ref="emailInputRef"
            @keyup.enter="handleLogin"
          />

          <Input
            v-model="password"
            type="password"
            label="Mot de passe"
            placeholder="••••••••••"
            :disabled="loading"
            :error="error || undefined"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- 2FA Input -->
        <div v-else-if="is2FAStep && !success && !loading" key="2fa-form" class="space-y-4 w-full">
          <p class="text-sm text-white/80 text-center leading-relaxed">
            Entrez le code à 6 chiffres :
          </p>
          <Input
            v-model="twoFACode"
            type="text"
            placeholder="000000"
            maxlength="6"
            :disabled="loading"
            :error="error || undefined"
            ref="twoFAInputRef"
            @keyup.enter="handle2FASubmit"
            class="font-mono text-center text-2xl tracking-widest"
          />
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" key="loading" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div
              class="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"
            ></div>
          </div>
          <p class="text-lg font-semibold text-white">Authentification en cours...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="success" key="success" class="text-center py-8">
          <div class="text-6xl mb-4 animate-bounce">✓</div>
          <p class="text-lg font-semibold text-green-400">Amazon Games connecté avec succès!</p>
        </div>
      </Transition>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="show = false" :disabled="loading"> Annuler </Button>
        <Button
          v-if="!is2FAStep && !success"
          variant="primary"
          @click="handleLogin"
          :disabled="!isFormValid || loading"
          :loading="loading"
        >
          Se connecter
        </Button>
        <Button
          v-else-if="is2FAStep && !success"
          variant="primary"
          @click="handle2FASubmit"
          :disabled="!is2FACodeValid || loading"
          :loading="loading"
        >
          Valider
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useAuthStore } from "@/stores/auth";
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

const email = ref("");
const password = ref("");
const twoFACode = ref("");
const is2FAStep = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const emailInputRef = ref<InstanceType<typeof Input> | null>(null);
const twoFAInputRef = ref<InstanceType<typeof Input> | null>(null);

// Create a computed ref for v-model that syncs with parent
const show = computed({
  get: () => props.show,
  set: (value) => {
    if (!value && !loading.value) {
      emit("close");
    }
  },
});

const isFormValid = computed(() => {
  return email.value.trim() !== "" && password.value.trim() !== "";
});

const is2FACodeValid = computed(() => {
  return /^\d{6}$/.test(twoFACode.value);
});

watch(
  () => props.show,
  async (newShow) => {
    if (newShow) {
      // Reset state
      email.value = "";
      password.value = "";
      twoFACode.value = "";
      is2FAStep.value = false;
      error.value = null;
      success.value = false;
      loading.value = false;

      // Focus email input
      await nextTick();
      emailInputRef.value?.$el?.querySelector("input")?.focus();
    }
  },
);

const handleLogin = async () => {
  if (!isFormValid.value || loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    await authStore.loginAmazon(email.value.trim(), password.value);
    success.value = true;
    emit("success");

    // Auto-close after success
    setTimeout(() => {
      show.value = false;
    }, 2000);
  } catch (err: any) {
    if (err?.errorType === "two_factor_required") {
      // Switch to 2FA step
      is2FAStep.value = true;
      await nextTick();
      twoFAInputRef.value?.$el?.querySelector("input")?.focus();
    } else {
      error.value = err?.message || "Authentication failed. Please check your credentials.";
    }
  } finally {
    loading.value = false;
  }
};

const handle2FASubmit = async () => {
  if (!is2FACodeValid.value || loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    await authStore.loginAmazonWith2FA(email.value.trim(), password.value, twoFACode.value);
    success.value = true;
    emit("success");

    // Auto-close after success
    setTimeout(() => {
      show.value = false;
    }, 2000);
  } catch (err: any) {
    error.value = err?.message || "2FA authentication failed. Please check the code.";
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
