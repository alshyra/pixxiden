import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { error as logError, info, warn } from "@tauri-apps/plugin-log";
import { getInstallationService } from "@/services";
import { useLibraryStore } from "./library";
import type { StoreType } from "@/types";

export type DownloadStatus = "queued" | "downloading" | "installing" | "completed" | "error";

export type BackgroundTaskType = "sync" | "enrichment" | "umu-sync";
export type BackgroundTaskStatus = "running" | "completed" | "error";

export interface BackgroundTask {
  id: string;
  type: BackgroundTaskType;
  label: string;
  status: BackgroundTaskStatus;
  progress: number; // 0-100
  detail: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface DownloadItem {
  gameId: string;
  gameTitle: string;
  store: StoreType;
  installPath: string;
  status: DownloadStatus;
  progress: number; // 0-100
  downloadSpeed: string;
  downloadedSize: string;
  totalSize: string;
  eta: string;
  error?: string;
  outputLines: string[]; // raw CLI output for live display
  startedAt: number;
  completedAt?: number;
}

export const useDownloadsStore = defineStore("downloads", () => {
  // === STATE ===
  const downloads = ref<Map<string, DownloadItem>>(new Map());
  const backgroundTasks = ref<BackgroundTask[]>([]);
  const installModalGameId = ref<string | null>(null);

  // === COMPUTED ===
  const isInstallModalOpen = computed(() => installModalGameId.value !== null);

  const activeDownloads = computed(() =>
    Array.from(downloads.value.values()).filter(
      (d) => d.status === "queued" || d.status === "downloading" || d.status === "installing",
    ),
  );

  const completedDownloads = computed(() =>
    Array.from(downloads.value.values()).filter((d) => d.status === "completed"),
  );

  const failedDownloads = computed(() =>
    Array.from(downloads.value.values()).filter((d) => d.status === "error"),
  );

  const hasActiveDownloads = computed(() => activeDownloads.value.length > 0);

  const totalActiveCount = computed(() => activeDownloads.value.length);

  // Background tasks computed
  const activeBackgroundTasks = computed(() =>
    backgroundTasks.value.filter((t) => t.status === "running"),
  );

  const completedBackgroundTasks = computed(() =>
    backgroundTasks.value.filter((t) => t.status === "completed" || t.status === "error"),
  );

  const hasActiveBackgroundTasks = computed(() => activeBackgroundTasks.value.length > 0);

  // Combined: any active activity (downloads or background tasks)
  const hasActiveActivity = computed(
    () => hasActiveDownloads.value || hasActiveBackgroundTasks.value,
  );

  // === INSTALL MODAL ===
  function openInstallModal(gameId: string) {
    installModalGameId.value = gameId;
  }

  function closeInstallModal() {
    installModalGameId.value = null;
  }

  // === DOWNLOAD MANAGEMENT ===

  /**
   * Start a game installation — called from InstallModal.confirmInstall()
   * Registers the download in the store and delegates to InstallationService.
   * The modal can be closed while the download continues in background.
   */
  async function startInstallation(
    gameId: string,
    gameTitle: string,
    store: StoreType,
    installPath: string,
    totalSize: string,
  ) {
    // Register the download
    const item: DownloadItem = {
      gameId,
      gameTitle,
      store,
      installPath,
      status: "queued",
      progress: 0,
      downloadSpeed: "",
      downloadedSize: "",
      totalSize,
      eta: "",
      outputLines: [],
      startedAt: Date.now(),
    };
    downloads.value.set(gameId, item);

    await info(`[Downloads] Starting installation: ${gameTitle} (${store})`);

    try {
      const installationService = getInstallationService();
      await installationService.installGame(gameId, store, {
        installPath,
        onProgress: (progress) => {
          const existing = downloads.value.get(gameId);
          if (!existing) return;

          // Update status
          if (progress.status) {
            existing.status = progress.status;
          }

          // Only update progress if it's a real value (not -1 sentinel)
          if (progress.progress >= 0) {
            existing.progress = progress.progress;
          }

          if (progress.downloadSpeed !== undefined) {
            existing.downloadSpeed = formatSpeed(progress.downloadSpeed);
          }
          if (progress.downloadedSize) {
            existing.downloadedSize = progress.downloadedSize;
          }
          if (progress.totalSize) {
            existing.totalSize = progress.totalSize;
          }
          if (progress.eta !== undefined) {
            existing.eta = formatEta(progress.eta);
          }
          if (progress.error) {
            existing.error = progress.error;
          }

          // Append raw CLI output line for live display
          if (progress.outputLine) {
            existing.outputLines.push(progress.outputLine);
            // Keep max 500 lines to avoid memory issues
            if (existing.outputLines.length > 500) {
              existing.outputLines.splice(0, existing.outputLines.length - 500);
            }
          }

          if (progress.status === "completed") {
            existing.completedAt = Date.now();
            // Update library store
            const libraryStore = useLibraryStore();
            libraryStore.fetchGames();
          }
        },
      });

      // Mark as completed if not already done by onProgress
      const finalItem = downloads.value.get(gameId);
      if (finalItem && finalItem.status !== "completed") {
        finalItem.status = "completed";
        finalItem.progress = 100;
        finalItem.completedAt = Date.now();
      }

      await info(`[Downloads] Completed: ${gameTitle}`);
    } catch (error) {
      const item = downloads.value.get(gameId);
      if (item) {
        item.status = "error";
        item.error = error instanceof Error ? error.message : String(error);
      }
      await logError(`[Downloads] Failed: ${gameTitle} — ${error}`);
    }
  }

  /**
   * Cancel an ongoing download
   */
  async function cancelDownload(gameId: string) {
    const installationService = getInstallationService();
    await installationService.cancelInstallation(gameId);

    const item = downloads.value.get(gameId);
    if (item) {
      item.status = "error";
      item.error = "Annulé par l'utilisateur";
    }
  }

  /**
   * Remove a completed/failed download from the list
   */
  function dismissDownload(gameId: string) {
    downloads.value.delete(gameId);
  }

  /**
   * Clear all completed downloads
   */
  function clearCompleted() {
    for (const [id, item] of downloads.value) {
      if (item.status === "completed" || item.status === "error") {
        downloads.value.delete(id);
      }
    }
  }

  /**
   * Check if a specific game is currently downloading
   */
  function isDownloading(gameId: string): boolean {
    const item = downloads.value.get(gameId);
    return (
      item !== undefined &&
      (item.status === "downloading" || item.status === "queued" || item.status === "installing")
    );
  }

  /**
   * Get download info for a specific game
   */
  function getDownload(gameId: string): DownloadItem | undefined {
    return downloads.value.get(gameId);
  }

  /**
   * Fetch game size info from the store CLI (e.g. `legendary info`)
   */
  async function fetchGameInfo(gameId: string, store: StoreType) {
    const installationService = getInstallationService();
    return installationService.getGameInfo(gameId, store);
  }

  // === BACKGROUND TASKS ===

  /**
   * Start a background task (sync, enrichment, umu-sync, etc.)
   * The task runs asynchronously and its progress is visible in the Downloads view.
   * @param type Type of background task
   * @param label Human-readable label displayed in the UI
   * @param executor Async function that performs the work. Receives the task object for progress updates.
   */
  async function startBackgroundTask(
    type: BackgroundTaskType,
    label: string,
    executor: (task: BackgroundTask) => Promise<void>,
  ): Promise<void> {
    const id = `${type}-${Date.now()}`;
    const task: BackgroundTask = {
      id,
      type,
      label,
      status: "running",
      progress: 0,
      detail: "",
      startedAt: Date.now(),
    };

    backgroundTasks.value.push(task);
    // After push, Vue proxifies the object — use the reactive reference for mutations
    const reactiveTask = backgroundTasks.value[backgroundTasks.value.length - 1];
    await info(`[BackgroundTask] Started: ${label} (${type})`);

    // Run the executor asynchronously — don't await (fire-and-forget)
    executor(reactiveTask)
      .then(async () => {
        const t = backgroundTasks.value.find((t) => t.id === id);
        if (t) {
          t.status = "completed";
          t.progress = 100;
          t.completedAt = Date.now();
          const duration = ((t.completedAt - t.startedAt) / 1000).toFixed(1);
          await info(`[BackgroundTask] Completed: ${label} in ${duration}s`);
        }
      })
      .catch(async (error) => {
        const t = backgroundTasks.value.find((t) => t.id === id);
        if (t) {
          t.status = "error";
          t.error = error instanceof Error ? error.message : String(error);
          t.completedAt = Date.now();
          await warn(`[BackgroundTask] Failed: ${label} — ${t.error}`);
        }
      });
  }

  /**
   * Update progress of a background task
   */
  function updateBackgroundTaskProgress(id: string, progress: number, detail?: string) {
    const task = backgroundTasks.value.find((t) => t.id === id);
    if (task) {
      task.progress = progress;
      if (detail !== undefined) task.detail = detail;
    }
  }

  /**
   * Dismiss a completed/failed background task
   */
  function dismissBackgroundTask(id: string) {
    const idx = backgroundTasks.value.findIndex((t) => t.id === id);
    if (idx !== -1) backgroundTasks.value.splice(idx, 1);
  }

  /**
   * Clear all completed background tasks
   */
  function clearCompletedBackgroundTasks() {
    backgroundTasks.value = backgroundTasks.value.filter((t) => t.status === "running");
  }

  return {
    // State
    downloads,
    backgroundTasks,
    installModalGameId,

    // Computed
    isInstallModalOpen,
    activeDownloads,
    completedDownloads,
    failedDownloads,
    hasActiveDownloads,
    totalActiveCount,
    activeBackgroundTasks,
    completedBackgroundTasks,
    hasActiveBackgroundTasks,
    hasActiveActivity,

    // Modal
    openInstallModal,
    closeInstallModal,

    // Downloads
    startInstallation,
    cancelDownload,
    dismissDownload,
    clearCompleted,
    isDownloading,
    getDownload,
    fetchGameInfo,

    // Background Tasks
    startBackgroundTask,
    updateBackgroundTaskProgress,
    dismissBackgroundTask,
    clearCompletedBackgroundTasks,
  };
});

// === Helpers ===

function formatSpeed(mbPerSec: number): string {
  if (mbPerSec < 1) return `${Math.round(mbPerSec * 1024)} KB/s`;
  return `${mbPerSec.toFixed(1)} MB/s`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}
