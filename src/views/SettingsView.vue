<template>
  <div class="fixed inset-0 flex gap-6 p-6 pb-20 z-50 bg-black/85 backdrop-blur-lg">
    <!-- Sidebar -->
    <aside
      class="w-[280px] flex-shrink-0 bg-[#0f0f12]/98 backdrop-blur-[40px] p-6 flex flex-col"
      :class="{ 'ring-2 ring-[#5e5ce6]': focusZone === 'sidebar' }"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 mb-8 px-2">
        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <PixxidenLogo :size="40" :glow="true" />
        </div>
        <span class="text-xl font-bold italic text-white">Pixxiden</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 flex flex-col gap-8">
        <div class="text-[0.7rem] font-bold text-white/40 tracking-[0.15em] mb-3 px-2">
          CONFIGURATION
        </div>

        <button
          v-for="(section, index) in sections"
          :key="section.id"
          @click="selectSection(section.id)"
          class="flex items-center gap-3 px-2 text-left text-sm font-bold transition-all duration-300"
          :class="[
            activeSection === section.id ? 'text-white' : 'text-gray-500 hover:text-gray-300',
            focusZone === 'sidebar' &&
              focusedMenuIndex === index &&
              'ring-2 ring-white/50 rounded-lg',
          ]"
        >
          <span class="remix-nav-item relative" :class="{ active: activeSection === section.id }">
            {{ section.label }}
          </span>
        </button>
      </nav>

      <!-- Version Badge -->
      <div class="p-4 border border-white/10 rounded-xl text-center mb-4">
        <div class="text-[0.65rem] font-bold text-white/40 tracking-[0.15em] mb-1">VERSION</div>
        <div class="text-sm font-bold text-[#5e5ce6]">v0.1.0-alpha</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main
      class="flex-1 bg-[#141419]/95 border border-white/10 rounded-[10px] p-8 overflow-y-auto"
      :class="{ 'ring-2 ring-[#5e5ce6]': focusZone === 'content' }"
    >
      <!-- Système Section -->
      <SettingsSystem
        v-if="activeSection === 'systeme'"
        :loading="loadingSystem"
        :system-info="systemInfo"
        :disk-info="diskInfo"
        :checking-updates="checkingUpdates"
        @check-updates="checkUpdates"
        @shutdown="shutdown"
      />

      <!-- Comptes Section -->
      <SettingsAccounts
        v-if="activeSection === 'comptes'"
        :stores="stores"
        @toggle-connection="toggleStoreConnection"
      />

      <!-- Clés API Section -->
      <SettingsApiKeys
        v-if="activeSection === 'api-keys'"
        v-model="apiKeys"
        :loading="loadingApiKeys"
        :saving="savingApiKeys"
        :testing="testingApiKeys"
        :test-results="apiKeyTestResults"
        @save="saveApiKeys"
        @test="testApiKeys"
      />

      <!-- Avancé Section -->
      <SettingsAdvanced
        v-if="activeSection === 'avance'"
        v-model:proton-version="protonVersion"
        v-model:mango-hud-enabled="mangoHudEnabled"
        :proton-versions="protonVersions"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import * as api from "@/services/api";
import type { SystemInfo, DiskInfo } from "@/services/api";
import { PixxidenLogo } from "@/components/ui";
import { useGamepad } from "@/composables/useGamepad";
import {
  SettingsSystem,
  SettingsAccounts,
  SettingsApiKeys,
  SettingsAdvanced,
  type StoreAccount,
  type ApiKeys,
  type ApiKeyTestResults,
} from "@/components/settings";

const router = useRouter();
const { on: onGamepad } = useGamepad();

const sections = [
  { id: "systeme", label: "Système" },
  { id: "comptes", label: "Comptes" },
  { id: "api-keys", label: "Clés API" },
  { id: "avance", label: "Avancé" },
];

// Navigation state
const activeSection = ref("systeme");
const focusZone = ref<"sidebar" | "content">("sidebar");
const focusedMenuIndex = ref(0);

// System state
const systemInfo = ref<SystemInfo | null>(null);
const diskInfo = ref<DiskInfo[]>([]);
const loadingSystem = ref(false);
const checkingUpdates = ref(false);

// Store state
const stores = ref<StoreAccount[]>([
  { id: "epic", name: "Epic Games", available: false, authenticated: false, username: "" },
  { id: "gog", name: "GOG Galaxy", available: false, authenticated: false, username: "" },
  { id: "amazon", name: "Amazon Games", available: false, authenticated: false, username: "" },
  { id: "steam", name: "Steam", available: false, authenticated: false, username: "" },
]);

// Settings state
const protonVersion = ref("ge-proton-8-32");
const mangoHudEnabled = ref(false);

// API Keys state
const apiKeys = ref<ApiKeys>({
  steamgriddbApiKey: "",
  igdbClientId: "",
  igdbClientSecret: "",
  steamApiKey: "",
  steamId: "",
});
const loadingApiKeys = ref(false);
const savingApiKeys = ref(false);
const testingApiKeys = ref(false);
const apiKeyTestResults = ref<ApiKeyTestResults>({
  steamgriddb: null,
  igdb: null,
  steam: null,
});

// Proton versions options
const protonVersions = [
  { value: "ge-proton-8-32", label: "GE-Proton 8-32" },
  { value: "ge-proton-8-31", label: "GE-Proton 8-31" },
  { value: "ge-proton-8-30", label: "GE-Proton 8-30" },
  { value: "proton-experimental", label: "Proton Experimental" },
];

// Select section and move to content zone
function selectSection(sectionId: string) {
  activeSection.value = sectionId;
  focusZone.value = "content";
}

// Close settings
function closeSettings() {
  router.push("/");
}

// Load system info
async function loadSystemInfo() {
  loadingSystem.value = true;
  try {
    systemInfo.value = await api.getSystemInfo();
    diskInfo.value = await api.getDiskInfo();
  } catch (error) {
    console.error("Failed to load system info:", error);
  } finally {
    loadingSystem.value = false;
  }
}

// Load store status
async function loadStoreStatus() {
  try {
    const storeStatuses = await api.getStoreStatus();
    storeStatuses.forEach((status) => {
      const store = stores.value.find((s) => s.id === status.name);
      if (store) {
        store.available = status.available;
        store.authenticated = status.authenticated;
        store.username = status.username || "";
      }
    });
    console.log("🏪 Store status loaded:", storeStatuses);
  } catch (error) {
    console.error("Failed to load store status:", error);
  }
}

// Load settings
async function loadSettings() {
  try {
    const settings = await api.getSettings();
    protonVersion.value = settings.protonVersion;
    mangoHudEnabled.value = settings.mangoHudEnabled;
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

// Toggle store connection
function toggleStoreConnection(store: StoreAccount) {
  console.log("Toggle connection for:", store.name);
  // TODO: Implement store connection/disconnection
}

// Check for updates
async function checkUpdates() {
  checkingUpdates.value = true;
  try {
    const hasUpdates = await api.checkForUpdates();
    if (!hasUpdates) {
      console.log("No updates available");
    }
  } catch (error) {
    console.error("Failed to check updates:", error);
  } finally {
    checkingUpdates.value = false;
  }
}

// Shutdown
async function shutdown() {
  if (confirm("Êtes-vous sûr de vouloir éteindre la machine ?")) {
    try {
      await api.shutdownSystem();
    } catch (error) {
      console.error("Failed to shutdown:", error);
    }
  }
}

// Load API keys
async function loadApiKeys() {
  loadingApiKeys.value = true;
  try {
    const keys = await api.getApiKeys();
    apiKeys.value = {
      steamgriddbApiKey: keys.steamgriddbApiKey || "",
      igdbClientId: keys.igdbClientId || "",
      igdbClientSecret: keys.igdbClientSecret || "",
      steamApiKey: keys.steamApiKey || "",
      steamId: keys.steamId || "",
    };
  } catch (error) {
    console.error("Failed to load API keys:", error);
  } finally {
    loadingApiKeys.value = false;
  }
}

// Save API keys
async function saveApiKeys() {
  savingApiKeys.value = true;
  try {
    await api.saveApiKeys(apiKeys.value);
    console.log("API keys saved");
  } catch (error) {
    console.error("Failed to save API keys:", error);
  } finally {
    savingApiKeys.value = false;
  }
}

// Test API keys
async function testApiKeys() {
  testingApiKeys.value = true;
  apiKeyTestResults.value = { steamgriddb: null, igdb: null, steam: null };

  try {
    const results = await api.testApiKeys(apiKeys.value);
    apiKeyTestResults.value = {
      steamgriddb: results.steamgriddbValid ?? null,
      igdb: results.igdbValid ?? null,
      steam: results.steamValid ?? null,
    };
  } catch (error) {
    console.error("Failed to test API keys:", error);
  } finally {
    testingApiKeys.value = false;
  }
}

// Keyboard handler
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" || e.key === "b" || e.key === "B") {
    e.preventDefault();
    closeSettings();
  }
}

// Navigation in settings sections with gamepad
function navigateSidebar(direction: "up" | "down") {
  const maxIndex = sections.length - 1;

  if (direction === "up" && focusedMenuIndex.value > 0) {
    focusedMenuIndex.value--;
  } else if (direction === "down" && focusedMenuIndex.value < maxIndex) {
    focusedMenuIndex.value++;
  }
}

// Gamepad handlers
onGamepad("back", () => {
  if (focusZone.value === "content") {
    // Return to sidebar from content
    focusZone.value = "sidebar";
  } else {
    // Close settings
    closeSettings();
  }
});

onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (focusZone.value === "sidebar") {
    if (direction === "up" || direction === "down") {
      navigateSidebar(direction as "up" | "down");
    }
  }
  // Content navigation is handled by child components
});

onGamepad("confirm", () => {
  if (focusZone.value === "sidebar") {
    // Select the focused menu item
    const section = sections[focusedMenuIndex.value];
    if (section) {
      selectSection(section.id);
    }
  }
});

onMounted(async () => {
  window.addEventListener("keydown", handleKeyDown);

  // Load data with error handling for E2E test compatibility
  try {
    await Promise.all([loadSystemInfo(), loadStoreStatus(), loadSettings(), loadApiKeys()]);
    console.log("✅ [SettingsView] All data loaded successfully");
  } catch (e) {
    console.warn("[SettingsView] Failed to load some data (expected in E2E tests):", e);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
/* Animation fade-in */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease;
}

/* Custom scrollbar */
main::-webkit-scrollbar {
  width: 6px;
}

main::-webkit-scrollbar-track {
  background: transparent;
}

main::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

main::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ReMiX Nav Item - Underline animé */
.remix-nav-item::after {
  content: "";
  position: absolute;
  bottom: -6px;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #5e5ce6;
  box-shadow:
    0 0 15px #5e5ce6,
    0 0 5px #5e5ce6;
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.remix-nav-item.active::after {
  width: 100%;
}

.remix-nav-item.active {
  text-shadow: 0 0 15px rgba(94, 92, 230, 0.5);
}

/* Responsive */
@media (max-width: 1024px) {
  .fixed {
    flex-direction: column;
    padding: 1rem;
  }

  aside {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }

  nav {
    flex-direction: row;
    flex: unset;
    gap: 0.5rem;
  }

  .text-\[0\.7rem\] {
    display: none;
  }

  .version-badge {
    display: none;
  }

  .close-button {
    margin-left: auto;
  }

  .text-\[3\.5rem\] {
    font-size: 2.5rem;
  }

  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>
