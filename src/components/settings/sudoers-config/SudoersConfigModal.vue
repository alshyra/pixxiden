<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg">
    <div class="w-[600px] bg-[#141419] border border-white/10 rounded-[20px] overflow-hidden">
      <div class="p-8 border-b border-white/10">
        <h2 class="text-2xl font-black text-white italic tracking-tight mb-2">
          Configuration des mises à jour système
        </h2>
      </div>
      <div class="p-8">
        <SudoersConfigSteps
          :step="step"
          :password="password"
          :show-password="showPassword"
          :error="error"
          @update:password="(val) => (password = val)"
          @update:showPassword="(val) => (showPassword = val)"
          @validate="configure"
        >
          <template #error-details>
            <span v-if="error">{{ error }}</span>
          </template>
        </SudoersConfigSteps>
      </div>
      <div class="p-6 border-t border-white/10 flex justify-end gap-4">
        <template v-if="step === 'info'">
          <Button variant="ghost" @click="$emit('close')">Plus tard</Button>
          <Button variant="primary" @click="step = 'password'">Continuer</Button>
        </template>
        <template v-else-if="step === 'password'">
          <Button variant="ghost" @click="step = 'info'" :disabled="configuring">Retour</Button>
          <Button
            variant="primary"
            @click="configure"
            :loading="configuring"
            :disabled="!password || configuring"
          >
            {{ configuring ? "Configuration..." : "Valider" }}
          </Button>
        </template>
        <template v-else-if="step === 'success'">
          <Button variant="primary" @click="$emit('configured')">OK</Button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui";
import SudoersConfigSteps from "../sudoers-config/SudoersConfigSteps.vue";
import * as api from "@/services/api";

type Step = "info" | "password" | "success";

const step = ref<Step>("info");
let password = ref("");
let showPassword = ref(false);
let configuring = ref(false);
let error = ref<string | null>(null);

defineEmits<{ close: []; configured: [] }>();

async function configure() {
  if (!password.value) return;
  configuring.value = true;
  error.value = null;
  try {
    await api.configureSudoers(password.value);
    step.value = "success";
  } catch (e: any) {
    error.value = e.message || "Échec de la configuration";
    console.error("Failed to configure sudoers:", e);
  } finally {
    configuring.value = false;
  }
}
</script>
