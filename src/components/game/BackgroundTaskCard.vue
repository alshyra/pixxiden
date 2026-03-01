<template>
  <div class="flex items-center gap-4 p-4 bg-remix-bg-card/60 border border-white/5 rounded-xl">
    <!-- Icon -->
    <div class="flex-shrink-0">
      <component
        :is="taskIcon"
        class="w-5 h-5"
        :class="isActive ? 'text-blue-400 animate-pulse' : 'text-white/40'"
      />
    </div>

    <!-- Task Info -->
    <div class="flex-1 min-w-0">
      <h3 class="text-sm font-bold text-white/80 truncate">{{ task.label }}</h3>

      <!-- Progress Bar (active only) -->
      <div v-if="isActive" class="mt-2">
        <ProgressBar
          :value="task.progress"
          :indeterminate="task.progress === 0"
          variant="gradient"
          size="sm"
          bordered
        >
          <template #subtitle>
            <span
              v-if="task.detail"
              class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter"
            >
              {{ task.detail }}
            </span>
          </template>
        </ProgressBar>
      </div>

      <!-- Status text -->
      <p v-if="task.status === 'completed'" class="text-xs text-remix-success mt-1">
        ✅ {{ task.detail || "Terminé" }}
      </p>
      <p v-if="task.status === 'error'" class="text-xs text-remix-error mt-1 truncate">
        ❌ {{ task.error || "Erreur" }}
      </p>
    </div>

    <!-- Duration -->
    <div v-if="!isActive" class="text-right whitespace-nowrap">
      <span class="text-xs text-white/30">{{ formattedDuration }}</span>
    </div>

    <!-- Dismiss button (completed/error only) -->
    <Button v-if="!isActive" variant="ghost" size="sm" @click="emit('dismiss')">
      <template #icon>
        <X class="w-4 h-4" />
      </template>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button, ProgressBar } from "@/components/ui";
import { X, RefreshCw, Sparkles, Database } from "lucide-vue-next";
import type { BackgroundTask } from "@/stores/downloads";

const props = defineProps<{
  task: BackgroundTask;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const isActive = computed(() => props.task.status === "running");

const taskIcon = computed(() => {
  switch (props.task.type) {
    case "sync":
      return RefreshCw;
    case "enrichment":
      return Sparkles;
    case "umu-sync":
      return Database;
    default:
      return RefreshCw;
  }
});

const formattedDuration = computed(() => {
  if (!props.task.completedAt) return "";
  const seconds = Math.round((props.task.completedAt - props.task.startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
});
</script>

