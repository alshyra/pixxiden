<template>
  <div class="flex flex-col gap-8">
    <SudoersConfigInfo v-if="step === 'info'" />
    <SudoersConfigPassword
      v-else-if="step === 'password'"
      :password="password"
      :show-password="showPassword"
      :error="error"
      @update:password="$emit('update:password', $event)"
      @update:showPassword="$emit('update:showPassword', $event)"
      @validate="$emit('validate')"
    />
    <SudoersConfigSuccess v-else-if="step === 'success'" />
    <SudoersConfigError v-else-if="step === 'error'">
      <template #details>
        <slot name="error-details" />
      </template>
    </SudoersConfigError>
  </div>
</template>
<script setup lang="ts">
import SudoersConfigInfo from "./SudoersConfigInfo.vue";
import SudoersConfigPassword from "./SudoersConfigPassword.vue";
import SudoersConfigSuccess from "./SudoersConfigSuccess.vue";
import SudoersConfigError from "./SudoersConfigError.vue";

defineProps<{
  step: "info" | "password" | "success" | "error";
  password?: string;
  showPassword?: boolean;
  error?: string | null;
}>();
defineEmits(["update:password", "update:showPassword", "validate"]);
</script>
