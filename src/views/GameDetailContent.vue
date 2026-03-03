<template>
  <div
    data-testid="game-detail"
    class="absolute bottom-0 left-0 right-0 h-[42vh] flex flex-col bg-[#0d0d0f]"
  >
    <div class="action-bar">
      <GameActions />

      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="tab-content">
      <GameOverviewTab v-if="activeTab === 'overview'" />
      <GameMediaTab v-if="activeTab === 'media'" />
      <GameInfoTab v-if="activeTab === 'info'" />
    </div>

    <LaunchOverlay
      :is-visible="isLaunching"
      :game-title="game?.info.title || 'Game'"
      :runner="launchRunner"
      :error="launchError"
      @close="closeLaunchOverlay"
    />
  </div>
</template>

<script setup lang="ts">
import {
  GameActions,
  GameInfoTab,
  GameMediaTab,
  GameOverviewTab,
  LaunchOverlay,
} from "@/components/game";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useGamepad } from "@/composables/useGamepad";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { useDownloadsStore } from "@/stores/downloads";
import { useSideNavStore } from "@/stores/sideNav";
import { onKeyStroke } from "@vueuse/core";
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const downloadsStore = useDownloadsStore();
const { on: onGamepad } = useGamepad();
const sideNavStore = useSideNavStore();

const {
  game,
  isLaunching,
  launchError,
  launchRunner,
  playGame,
  closeLaunchOverlay,
  setupEventListeners,
  cleanup,
} = useCurrentGame();

const tabs = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "media", label: "Médias" },
  { id: "info", label: "Infos" },
] as const;

type TabId = (typeof tabs)[number]["id"];
const activeTab = ref<TabId>("overview");

function setPreviousTab() {
  const index = tabs.findIndex((tab) => tab.id === activeTab.value);
  activeTab.value = tabs[(index - 1 + tabs.length) % tabs.length].id;
}

function setNextTab() {
  const index = tabs.findIndex((tab) => tab.id === activeTab.value);
  activeTab.value = tabs[(index + 1) % tabs.length].id;
}

onKeyStroke(KEYBOARD_SHORTCUTS.BACK, () => {
  router.back();
});
onKeyStroke(KEYBOARD_SHORTCUTS.CONFIRM, () => {
  handleConfirm();
});

const cleanupBack = onGamepad("back", () => {
  if (sideNavStore.isOpen) return;
  router.back();
});
const cleanupConfirm = onGamepad("confirm", () => {
  if (sideNavStore.isOpen) return;
  handleConfirm();
});
const cleanupLb = onGamepad("lb", () => {
  if (sideNavStore.isOpen) return;
  setPreviousTab();
});
const cleanupRb = onGamepad("rb", () => {
  if (sideNavStore.isOpen) return;
  setNextTab();
});

function handleConfirm() {
  if (!game.value) return;
  if (!game.value.installation.installed) {
    downloadsStore.openInstallModal(game.value.id);
    return;
  }
  playGame();
}

onMounted(async () => {
  await setupEventListeners();
});

onUnmounted(() => {
  cleanupBack();
  cleanupConfirm();
  cleanupLb();
  cleanupRb();
  cleanup();
});
</script>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  padding: 16px 40px;
  gap: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.tab-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.tab-button {
  border: none;
  background: transparent;
  color: #a0a0b0;
  border-bottom: 3px solid transparent;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.tab-button.active {
  color: #ffffff;
  border-bottom-color: #5e5ce6;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  padding: 20px 40px;
}
</style>
