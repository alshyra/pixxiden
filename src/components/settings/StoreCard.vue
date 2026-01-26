<template>
  <div
    class="bg-gray-900/80 border-2 border-white/10 rounded-xl p-6 transition-all duration-300 cursor-pointer hover:border-purple-500/50 hover:bg-gray-800/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/20"
    :class="{
      'border-green-500/30 hover:border-green-500/50': authenticated,
      'ring-2 ring-purple-500': isFocused,
    }"
    @click="handleClick"
  >
    <div class="flex items-center gap-4 mb-5">
      <div class="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center p-3">
        <img :src="storeLogo" :alt="`${storeName} logo`" class="w-full h-full object-contain" />
      </div>
      <div class="flex-1">
        <h3 class="text-2xl font-semibold text-white mb-2">{{ storeName }}</h3>
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-base font-bold"
            :class="{
              'text-green-400': authenticated && store !== 'steam',
              'text-blue-500': store === 'steam',
              'text-slate-500': !authenticated && store !== 'steam',
            }"
          >
            {{ statusIcon }}
          </span>
          <span class="text-sm text-white/70">{{ statusText }}</span>
        </div>
        <div v-if="username" class="text-xs text-white/50 italic">
          {{ username }}
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <Button
        v-if="!authenticated && store !== 'steam'"
        variant="primary"
        class="flex-1"
        @click.stop="handleConnect"
        :disabled="loading"
        :loading="loading"
      >
        {{ loading ? "Connexion..." : "Se connecter" }}
      </Button>
      <Button
        v-else-if="authenticated && store !== 'steam'"
        variant="danger"
        class="flex-1"
        @click.stop="handleDisconnect"
        :disabled="loading"
      >
        Se déconnecter
      </Button>
      <div v-else-if="store === 'steam'" class="text-white/50 text-sm italic py-3">
        Aucune configuration requise
      </div>
    </div>

    <div
      v-if="configSource !== 'none' && configSource !== 'pixxiden'"
      class="mt-3 pt-3 border-t border-white/10"
    >
      <span
        class="inline-block px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-400"
      >
        Configuré via Heroic
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StoreType, AuthStatus } from "@/types";
import Button from "@/components/ui/Button.vue";

interface Props {
  store: StoreType;
  status: AuthStatus;
  loading?: boolean;
  isFocused?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isFocused: false,
});

const emit = defineEmits<{
  connect: [store: StoreType];
  disconnect: [store: StoreType];
}>();

const storeName = computed(() => {
  const names: Record<StoreType, string> = {
    epic: "Epic Games",
    gog: "GOG",
    amazon: "Amazon Games",
    steam: "Steam",
  };
  return names[props.store];
});

const storeLogo = computed(() => {
  // TODO: Replace with actual logo paths
  const logos: Record<StoreType, string> = {
    epic: "/assets/logos/epic.svg",
    gog: "/assets/logos/gog.svg",
    amazon: "/assets/logos/amazon.svg",
    steam: "/assets/logos/steam.svg",
  };
  return logos[props.store];
});

const authenticated = computed(() => props.status.authenticated);
const username = computed(() => props.status.username);
const configSource = computed(() => props.status.configSource);

const statusIcon = computed(() => {
  if (props.store === "steam") return "●";
  return authenticated.value ? "✓" : "○";
});

const statusText = computed(() => {
  if (props.store === "steam") {
    return authenticated.value ? "Détecté (local)" : "Non détecté";
  }
  return authenticated.value ? "Connecté" : "Non connecté";
});

const handleClick = () => {
  // Could be used for keyboard/gamepad navigation
};

const handleConnect = () => {
  emit("connect", props.store);
};

const handleDisconnect = () => {
  emit("disconnect", props.store);
};
</script>
