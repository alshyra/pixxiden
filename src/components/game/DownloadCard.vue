<template>
  <div class="flex items-center gap-4 p-4 bg-remix-bg-card/80 border border-white/8 rounded-xl">
    <!-- Store Badge -->
    <Badge :variant="download.store" :label="download.store.toUpperCase()" />

    <!-- Game Info -->
    <div class="flex-1 min-w-0">
      <h3 class="text-sm font-bold text-white truncate">{{ download.gameTitle }}</h3>

      <!-- Progress Bar (active only) -->
      <div v-if="isActive" class="mt-2">
        <ProgressBar
          :value="download.progress"
          variant="gradient"
          size="sm"
          :glow="true"
          bordered
          show-value
        >
          <template #subtitle>
            <span v-if="download.downloadSpeed" class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
              {{ download.downloadSpeed }}
            </span>
            <span v-if="download.eta" class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
              ~{{ download.eta }}
            </span>
          </template>
        </ProgressBar>
        <!-- Latest output line -->
        <p v-if="lastOutputLine" class="mt-1 text-[10px] font-mono text-white/30 truncate">
          {{ lastOutputLine }}
        </p>
      </div>

      <!-- Status text (completed / error) -->
      <p v-if="download.status === 'completed'" class="text-xs text-remix-success mt-1">
        ✅ Installé
      </p>
      <p v-if="download.status === 'error'" class="text-xs text-remix-error mt-1 truncate">
        ❌ {{ download.error || 'Erreur inconnue' }}
      </p>
    </div>

    <!-- Size -->
    <div class="text-right whitespace-nowrap">
      <span v-if="isActive && download.downloadedSize" class="text-xs text-white/60 block">
        {{ download.downloadedSize }}
      </span>
      <span class="text-xs text-white/40">{{ download.totalSize }}</span>
    </div>

    <!-- Actions -->
    <Button v-if="isActive" variant="ghost" size="sm" @click="emit('cancel')">
      <template #icon>
        <X class="w-4 h-4" />
      </template>
    </Button>
    <Button v-else variant="ghost" size="sm" @click="emit('dismiss')">
      <template #icon>
        <X class="w-4 h-4" />
      </template>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button, Badge, ProgressBar } from "@/components/ui";
import { X } from "lucide-vue-next";
import type { DownloadItem } from "@/stores/downloads";

/**
 * DownloadCard - Pure UI component for displaying a download item.
 * Used by DownloadsView. This is a UI component (not a Smart Component),
 * so it receives data via props, which is the correct pattern per project conventions.
 */

const props = defineProps<{
  download: DownloadItem;
}>();

const emit = defineEmits<{
  cancel: [];
  dismiss: [];
}>();

const isActive = computed(() =>
  props.download.status === "queued" ||
  props.download.status === "downloading" ||
  props.download.status === "installing"
);

const lastOutputLine = computed(() => {
  const lines = props.download.outputLines;
  return lines.length > 0 ? lines[lines.length - 1] : "";
});
</script>
