<template>
  <footer class="console-footer">
    <div class="footer-content">
      <!-- Control hints -->
      <div class="control-hints">
        <div 
          v-for="btn in buttons" 
          :key="btn.key" 
          class="control-hint"
        >
          <span :class="getButtonClass(btn.key)" class="btn-icon">
            {{ getButtonIcon(btn.key) }}
          </span>
          <span class="control-label">{{ btn.label }}</span>
        </div>
      </div>
      
      <!-- Status indicator -->
      <div class="status-section">
        <div class="status-indicator">
          <div class="status-dot" :class="{ 'connected': isConnected }"></div>
          <span class="status-text">{{ statusText }}</span>
        </div>
        
        <!-- Controller type badge -->
        <div class="controller-badge" v-if="controllerType !== 'keyboard'">
          <span class="badge-icon">🎮</span>
          <span class="badge-text">{{ controllerLabel }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFooterControls } from '@/composables/useFooterControls'

const { 
  buttons, 
  controllerType, 
  isConnected, 
  getButtonIcon, 
  getButtonClass 
} = useFooterControls()

const statusText = computed(() => {
  return isConnected.value ? 'Connecté' : 'Déconnecté'
})

const controllerLabel = computed(() => {
  switch (controllerType.value) {
    case 'ps': return 'PlayStation'
    case 'xbox': return 'Xbox'
    default: return 'Clavier'
  }
})
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

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

/* Keyboard style */
.btn-keyboard {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

/* PlayStation style */
.btn-ps-cross {
  background: rgba(94, 92, 230, 0.2);
  border: 1px solid rgba(94, 92, 230, 0.5);
  color: #5e5ce6;
}

.btn-ps-circle {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.btn-ps-square {
  background: rgba(236, 72, 153, 0.2);
  border: 1px solid rgba(236, 72, 153, 0.5);
  color: #ec4899;
}

.btn-ps-triangle {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.btn-ps-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 10px;
}

/* Xbox style */
.btn-xbox-a {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #10b981;
}

.btn-xbox-b {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.btn-xbox-x {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #3b82f6;
}

.btn-xbox-y {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #f59e0b;
}

.btn-xbox-back {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 10px;
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
</style>
