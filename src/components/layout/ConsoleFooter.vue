<template>
  <footer class="console-footer">
    <div class="footer-content">
      <!-- Status indicator -->
      <div class="status-section">
        <div class="status-indicator">
          <div class="status-dot" :class="{ connected: isConnected }"></div>
          <span class="status-text">{{ statusText }}</span>
        </div>

        <!-- Controller type badge -->
        <div class="controller-badge" v-if="controllerType !== 'keyboard'">
          <span class="badge-icon">🎮</span>
          <span class="badge-text">{{ controllerLabel }}</span>
        </div>

        <!-- Download indicator -->
        <router-link v-if="hasActiveDownloads" to="/downloads" class="download-badge">
          <Download class="w-3.5 h-3.5 animate-pulse" />
          <span class="badge-text">{{ totalActiveCount }}</span>
        </router-link>
      </div>
      <!-- Control hints -->
      <div class="control-hints">
        <div v-for="btn in buttons" :key="btn.key" class="control-hint">
          <ControllerButton :button="btn.key" :type="controllerType" size="md" />
          <span class="control-label">{{ btn.label }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useFooterControls } from "@/composables/useFooterControls";
import { useDownloadsStore } from "@/stores/downloads";
import { ControllerButton } from "@/components/ui";
import { Download } from "lucide-vue-next";

const { buttons, controllerType, isConnected } = useFooterControls();
const downloadsStore = useDownloadsStore();
const { hasActiveDownloads, totalActiveCount } = storeToRefs(downloadsStore);

const statusText = computed(() => (isConnected.value ? "Connecté" : "Déconnecté"));

const controllerLabel = computed(() => {
  switch (controllerType.value) {
    case "ps":
      return "PlayStation";
    case "xbox":
      return "Xbox";
    default:
      return "Clavier";
  }
});
</script>

<style scoped>
.console-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #050505;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  z-index: 100;
  display: flex;
  align-items: center;
}

.footer-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.control-hints {
  display: flex;
  gap: 2rem;
}

.control-hint {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.status-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.status-dot.connected {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
}

.controller-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: rgba(94, 92, 230, 0.15);
  border: 1px solid rgba(94, 92, 230, 0.3);
  border-radius: 20px;
}

.badge-icon {
  font-size: 12px;
}

.badge-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(94, 92, 230, 1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.download-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;
  color: rgb(16, 185, 129);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.download-badge:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: rgba(16, 185, 129, 0.5);
}

.download-badge .badge-text {
  color: rgb(16, 185, 129);
}
</style>
