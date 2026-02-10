<template>
  <Modal
    v-model="isOpen"
    title="Éteindre"
    size="sm"
    :close-on-backdrop="false"
  >
    <div class="space-y-4">
      <p class="text-white/60 text-sm mb-6">
        Que voulez-vous faire ?
      </p>

      <!-- Options -->
      <div class="space-y-3">
        <Button
          variant="danger"
          size="lg"
          class="w-full justify-start"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 0 }"
          @click="handleShutdown"
        >
          <template #icon>
            <Power class="w-5 h-5" />
          </template>
          Éteindre le système
        </Button>

        <Button
          variant="outline"
          size="lg"
          class="w-full justify-start"
          :class="{ 'ring-2 ring-[#5e5ce6]': focusedIndex === 1 }"
          @click="handleQuit"
        >
          <template #icon>
            <LogOut class="w-5 h-5" />
          </template>
          Quitter l'application
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Modal, Button } from "@/components/ui";
import { Power, LogOut } from "lucide-vue-next";
import { useGamepad } from "@/composables/useGamepad";
import { shutdownSystem } from "@/services/api";
import { getCurrentWindow } from "@tauri-apps/api/window";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  shutdown: [];
  quit: [];
}>();

// Internal state
const isOpen = computed({
  get: () => props.show,
  set: (value: boolean) => {
    if (!value) emit("close");
  },
});

const focusedIndex = ref(0);

// Reset focus when modal opens
watch(() => props.show, (show) => {
  if (show) {
    focusedIndex.value = 0;
  }
});

// Gamepad navigation
const { on: onGamepad } = useGamepad();

onGamepad("navigate", ({ direction }: { direction: string }) => {
  if (!props.show) return;

  if (direction === "up" && focusedIndex.value > 0) {
    focusedIndex.value--;
  } else if (direction === "down" && focusedIndex.value < 1) {
    focusedIndex.value++;
  }
});

onGamepad("confirm", () => {
  if (!props.show) return;

  if (focusedIndex.value === 0) {
    handleShutdown();
  } else if (focusedIndex.value === 1) {
    handleQuit();
  }
});

onGamepad("back", () => {
  if (!props.show) return;
  emit("close");
});

// Actions
async function handleShutdown() {
  emit("shutdown");
  try {
    await shutdownSystem();
  } catch (error) {
    console.error("Failed to shutdown system:", error);
  }
}

async function handleQuit() {
  emit("quit");
  try {
    const window = getCurrentWindow();
    await window.close();
  } catch (error) {
    console.error("Failed to quit application:", error);
  }
}
</script>
