<template>
  <div>
    <h3 class="text-[10px] uppercase tracking-[0.4em] text-white/40 font-black mb-2">
      Authentification requise
    </h3>
    <input
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      placeholder="Mot de passe administrateur"
      class="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
      @keyup.enter="$emit('validate')"
    />
    <button
      type="button"
      @click="showPassword = !showPassword"
      class="mt-2 text-white/30 hover:text-white/50"
    >
      {{ showPassword ? "Masquer" : "Afficher" }} le mot de passe
    </button>
    <div v-if="error" class="flex items-center gap-2 text-red-400 text-sm mt-2">
      <span>{{ error }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ password: string; showPassword: boolean; error: string | null }>();
const { password } = ref(props);
defineEmits<{
  "update:password": [value: string];
  "update:showPassword": [value: boolean];
  validate: [];
}>();
</script>
