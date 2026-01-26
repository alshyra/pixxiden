<template>
  <button
    @click="$emit('click')"
    class="flex items-center gap-3 px-2 text-left text-sm font-bold transition-all duration-300"
    :class="[
      active ? 'text-white' : 'text-gray-500 hover:text-gray-300',
      focused && 'ring-2 ring-white/50 rounded-lg',
    ]"
  >
    <span class="remix-nav-item relative" :class="{ active }">
      {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  icon?: string;
  active: boolean;
  focused: boolean;
}>();

defineEmits<{
  click: [];
}>();
</script>

<style scoped>
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
</style>
