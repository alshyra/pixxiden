<template>
  <div class="animate-fade-in">
    <header class="mb-14">
      <h2
        class="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      >
        Clés API
      </h2>
      <p class="text-gray-500 text-lg italic font-medium">
        Configurez vos clés API pour enrichir les données de vos jeux.
      </p>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex items-center justify-center gap-4 p-12 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[10px]"
    >
      <div class="w-6 h-6 border-2 border-white/10 border-t-[#5e5ce6] rounded-full animate-spin" />
      <span class="text-white/50">Chargement des clés API...</span>
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- SteamGridDB -->
      <ApiKeyCard
        title="🎨 SteamGridDB"
        description="Covers, bannières et logos de haute qualité"
        help-url="https://www.steamgriddb.com/profile/preferences/api"
        help-text="Obtenir une clé →"
        :valid="testResults.steamgriddb"
      >
        <Input
          :model-value="modelValue.steamgriddbApiKey"
          type="password"
          placeholder="Clé API SteamGridDB"
          @update:model-value="updateKey('steamgriddbApiKey', $event)"
        />
      </ApiKeyCard>

      <!-- IGDB (Twitch) -->
      <ApiKeyCard
        title="🎮 IGDB (Twitch)"
        description="Base de données de jeux (descriptions, notes, genres)"
        help-url="https://dev.twitch.tv/console/apps"
        help-text="Créer une application Twitch →"
        :valid="testResults.igdb"
      >
        <div class="grid grid-cols-2 gap-4">
          <Input
            :model-value="modelValue.igdbClientId"
            type="text"
            placeholder="Client ID"
            @update:model-value="updateKey('igdbClientId', $event)"
          />
          <Input
            :model-value="modelValue.igdbClientSecret"
            type="password"
            placeholder="Client Secret"
            @update:model-value="updateKey('igdbClientSecret', $event)"
          />
        </div>
      </ApiKeyCard>

      <!-- Steam Web API -->
      <ApiKeyCard
        title="🎯 Steam Web API"
        description="Temps de jeu et statistiques Steam"
        help-url="https://steamcommunity.com/dev/apikey"
        help-text="Obtenir une clé →"
        :valid="testResults.steam"
      >
        <div class="grid grid-cols-2 gap-4">
          <Input
            :model-value="modelValue.steamApiKey"
            type="password"
            placeholder="Clé API Steam"
            @update:model-value="updateKey('steamApiKey', $event)"
          />
          <Input
            :model-value="modelValue.steamId"
            type="text"
            placeholder="Steam ID (ex: 76561198...)"
            @update:model-value="updateKey('steamId', $event)"
          />
        </div>
      </ApiKeyCard>

      <!-- Info message -->
      <div
        class="flex items-center gap-3 p-4 bg-[#5e5ce6]/10 border border-[#5e5ce6]/20 rounded-xl text-[0.85rem] text-white/70"
      >
        <Info class="w-5 h-5 flex-shrink-0" />
        <span>Ces clés sont stockées localement et jamais partagées.</span>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          :loading="testing"
          :disabled="testing"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 0 }"
          @click="testApiKeys"
        >
          <template #icon>
            <CheckCircle class="w-5 h-5" />
          </template>
          {{ testing ? "TEST EN COURS..." : "TESTER LES CLÉS" }}
        </Button>

        <Button
          variant="primary"
          size="lg"
          :loading="saving"
          :disabled="saving"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 1 }"
          @click="saveApiKeys"
        >
          <template #icon>
            <Check class="w-5 h-5" />
          </template>
          {{ saving ? "SAUVEGARDE..." : "SAUVEGARDER" }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Button, Input } from "@/components/ui";
import ApiKeyCard from "./ApiKeyCard.vue";
import { Info, CheckCircle, Check } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";
import * as api from "@/services/api";

export interface ApiKeys {
  steamgriddbApiKey: string;
  igdbClientId: string;
  igdbClientSecret: string;
  steamApiKey: string;
  steamId: string;
}

export interface ApiKeyTestResults {
  steamgriddb: boolean | null;
  igdb: boolean | null;
  steam: boolean | null;
}

const props = defineProps<{
  modelValue: ApiKeys;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ApiKeys];
}>();

const { on: onGamepad } = useGamepad();
const focusedIndex = ref(0);
const saving = ref(false);
const testing = ref(false);
const testResults = ref<ApiKeyTestResults>({
  steamgriddb: null,
  igdb: null,
  steam: null,
});

function updateKey(key: keyof ApiKeys, value: string) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

// Save API keys
async function saveApiKeys() {
  saving.value = true;
  try {
    await api.saveApiKeys(props.modelValue);
    console.log("API keys saved");
  } catch (error) {
    console.error("Failed to save API keys:", error);
  } finally {
    saving.value = false;
  }
}

// Test API keys
async function testApiKeys() {
  testing.value = true;
  testResults.value = { steamgriddb: null, igdb: null, steam: null };

  try {
    const results = await api.testApiKeys(props.modelValue);
    testResults.value = {
      steamgriddb: results.steamgriddbValid ?? null,
      igdb: results.igdbValid ?? null,
      steam: results.steamValid ?? null,
    };
  } catch (error) {
    console.error("Failed to test API keys:", error);
  } finally {
    testing.value = false;
  }
}

// Gamepad navigation
onMounted(() => {
  onGamepad("navigate", ({ direction }: { direction: string }) => {
    if (direction === "left" && focusedIndex.value > 0) {
      focusedIndex.value--;
    } else if (direction === "right" && focusedIndex.value < 1) {
      focusedIndex.value++;
    }
  });

  onGamepad("confirm", () => {
    if (focusedIndex.value === 0) {
      testApiKeys();
    } else if (focusedIndex.value === 1) {
      saveApiKeys();
    }
  });
});
</script>
