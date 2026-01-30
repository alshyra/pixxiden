<template>
  <RouterLink
    :to="section.id"
    class="relative underline-nav-item flex items-center gap-3 px-2 text-left text-sm font-bold transition-all duration-300 text-gray-500 hover:text-gray-300"
    :class="{ 'text-white active': isActive }"
  >
    {{ section.label }}
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { SettingsSection } from "./SettingsSidebar.vue";

const props = defineProps<{
  section: SettingsSection;
}>();

const route = useRoute();
const isActive = ref(route.path.includes(props.section.id));

// Petit délai pour laisser la transition CSS se jouer
watch(() => route.path, (newPath) => {
  const shouldBeActive = newPath.includes(props.section.id);
  if (shouldBeActive !== isActive.value) {
    // Délai pour permettre à l'ancienne animation de se terminer
    requestAnimationFrame(() => {
      isActive.value = shouldBeActive;
    });
  }
});

console.log('SettingsNavItem mounted, initial isActive:', isActive.value);
</script>

<style scoped>
.underline-nav-item::after {
  content: "";
  position: absolute;
  bottom: -6px;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #5e5ce6;
  box-shadow: 0 0 15px #5e5ce6, 0 0 5px #5e5ce6;
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.underline-nav-item.active::after {
  width: 100%;
}

.underline-nav-item.active {
  text-shadow: 0 0 10px rgba(94, 92, 230, 0.3);
}
</style>