<template>
  <div
    data-testid="game-detail"
    class="game-detail-fullscreen"
  >
    <GameHeroSection class="hero-section" />

    <div class="bottom-panel">
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
    </div>

    <!-- Launch Overlay -->
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
  GameHeroSection,
  GameInfoTab,
  GameMediaTab,
  GameOverviewTab,
  LaunchOverlay,
} from "@/components/game";
import { useCurrentGame } from "@/composables/useCurrentGame";
import { useGamepad } from "@/composables/useGamepad";
import { KEYBOARD_SHORTCUTS } from "@/constants/shortcuts";
import { useDownloadsStore } from "@/stores/downloads";
import { useLibraryStore } from "@/stores/library";
import { useSideNavStore } from "@/stores/sideNav";
import { onKeyStroke } from "@vueuse/core";
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

/**
 * GameDetails - Page détail d'un jeu (Layout Option B — Console UX)
 *
 * Architecture "Smart Components":
 * - Les composants enfants (GameHeroSection, GameActions, GameOverviewTab, GameMediaTab, GameInfoTab)
 *   récupèrent eux-mêmes leurs données via le composable useCurrentGame
 * - Le parent ne fait que l'orchestration (navigation, lifecycle, tabs, focus)
 * - Zéro "Props Drilling" : les données ne passent pas par le parent
 *
 * Navigation Gamepad:
 * - LB/RB: navigation entre les onglets (Vue d'ensemble / Médias / Infos)
 * - A/Confirm: Exécute l'action principale (Install ou Play selon l'état)
 * - B/Back: Retour à la bibliothèque
 */

// === STORE & COMPOSABLES ===
const router = useRouter();
const libraryStore = useLibraryStore();
const downloadsStore = useDownloadsStore();
const { on: onGamepad } = useGamepad();
const sideNavStore = useSideNavStore();

// useCurrentGame centralise l'accès aux données du jeu courant
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
  const nextIndex = (index - 1 + tabs.length) % tabs.length;
  activeTab.value = tabs[nextIndex].id;
}

function setNextTab() {
  const index = tabs.findIndex((tab) => tab.id === activeTab.value);
  const nextIndex = (index + 1) % tabs.length;
  activeTab.value = tabs[nextIndex].id;
}

// === INPUT HANDLERS ===
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

// Handler unifié pour Confirm: gère Install ET Play
function handleConfirm() {
  if (!game.value) return;

  // Si le jeu n'est pas installé: ouvrir InstallModal
  if (!game.value.installation.installed) {
    downloadsStore.openInstallModal(game.value.id);
    return;
  }

  // Si le jeu est installé: lancer
  playGame();
}

// === LIFECYCLE ===
onMounted(async () => {
  await setupEventListeners();

  if (libraryStore.games.length === 0) {
    await libraryStore.fetchGames();
  }
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
.game-detail-fullscreen {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #0d0d0f;
}

.hero-section {
  height: 60vh;
  flex-shrink: 0;
}

.bottom-panel {
  height: 40vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0d0d0f;
}

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
