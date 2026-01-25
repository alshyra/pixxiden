<template>
  <div class="controller-button" :class="[typeClass, sizeClass]">
    <!-- PlayStation Buttons -->
    <template v-if="type === 'ps'">
      <!-- Cross (X) -->
      <svg v-if="button === 'A'" viewBox="0 0 24 24" class="ps-cross">
        <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7a.996.996 0 10-1.41 1.41L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" fill="currentColor"/>
      </svg>
      <!-- Circle (O) -->
      <svg v-else-if="button === 'B'" viewBox="0 0 24 24" class="ps-circle">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
      </svg>
      <!-- Square -->
      <svg v-else-if="button === 'X'" viewBox="0 0 24 24" class="ps-square">
        <rect x="5" y="5" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.5"/>
      </svg>
      <!-- Triangle -->
      <svg v-else-if="button === 'Y'" viewBox="0 0 24 24" class="ps-triangle">
        <path d="M12 4L3 20h18L12 4z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
      <!-- L1 -->
      <div v-else-if="button === 'LB'" class="bumper-btn l1">L1</div>
      <!-- R1 -->
      <div v-else-if="button === 'RB'" class="bumper-btn r1">R1</div>
      <!-- Share/Options -->
      <div v-else-if="button === 'S'" class="option-btn">OPTIONS</div>
    </template>
    
    <!-- Xbox Buttons -->
    <template v-else-if="type === 'xbox'">
      <!-- A -->
      <div v-if="button === 'A'" class="xbox-btn xbox-a">A</div>
      <!-- B -->
      <div v-else-if="button === 'B'" class="xbox-btn xbox-b">B</div>
      <!-- X -->
      <div v-else-if="button === 'X'" class="xbox-btn xbox-x">X</div>
      <!-- Y -->
      <div v-else-if="button === 'Y'" class="xbox-btn xbox-y">Y</div>
      <!-- LB -->
      <div v-else-if="button === 'LB'" class="bumper-btn lb">LB</div>
      <!-- RB -->
      <div v-else-if="button === 'RB'" class="bumper-btn rb">RB</div>
      <!-- Back -->
      <div v-else-if="button === 'S'" class="option-btn">MENU</div>
    </template>
    
    <!-- Keyboard -->
    <template v-else>
      <div class="keyboard-key">{{ keyboardKey }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  button: 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'S'
  type: 'ps' | 'xbox' | 'keyboard'
  size?: 'sm' | 'md' | 'lg'
}>()

const keyboardKeys: Record<string, string> = {
  A: 'A',
  B: 'B',
  X: 'X',
  Y: 'Y',
  LB: 'Q',
  RB: 'E',
  S: 'ESC'
}

const keyboardKey = computed(() => keyboardKeys[props.button] || props.button)

const typeClass = computed(() => `type-${props.type}`)
const sizeClass = computed(() => `size-${props.size || 'md'}`)
</script>

<style scoped>
.controller-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Size variants */
.size-sm {
  width: 24px;
  height: 24px;
}

.size-md {
  width: 32px;
  height: 32px;
}

.size-lg {
  width: 40px;
  height: 40px;
}

.size-sm svg {
  width: 16px;
  height: 16px;
}

.size-md svg {
  width: 22px;
  height: 22px;
}

.size-lg svg {
  width: 28px;
  height: 28px;
}

/* PlayStation SVG icons */
.ps-cross {
  color: #4a8eff;
}

.ps-circle {
  color: #ff6b6b;
}

.ps-square {
  color: #ff8dd1;
}

.ps-triangle {
  color: #6fefa0;
}

/* PlayStation bumper buttons */
.type-ps .bumper-btn {
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.type-ps .l1,
.type-ps .r1 {
  min-width: 32px;
}

/* Xbox buttons */
.xbox-btn {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.xbox-a {
  background: linear-gradient(180deg, #3cb54a 0%, #2a9d38 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.xbox-b {
  background: linear-gradient(180deg, #e54b4b 0%, #c93c3c 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.xbox-x {
  background: linear-gradient(180deg, #3b8eea 0%, #2d72c2 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.xbox-y {
  background: linear-gradient(180deg, #f5c242 0%, #daa520 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* Xbox bumper buttons */
.type-xbox .bumper-btn {
  background: linear-gradient(180deg, #444 0%, #333 100%);
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  text-transform: uppercase;
}

/* Options/Menu buttons */
.option-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 4px 6px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

/* Keyboard keys */
.keyboard-key {
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  min-width: 28px;
  text-align: center;
  box-shadow: 0 2px 0 #1a1a1a;
}
</style>
