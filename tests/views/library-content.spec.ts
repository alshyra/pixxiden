/**
 * Tests for LibraryContent "watch(filteredGames)" logic.
 *
 * The watch is { immediate: true } so it fires on mount.
 * We observe the effect indirectly via libraryStore.featuredGameId
 * (which the watch calls via setFeaturedGame).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";

// ─── Static mocks ─────────────────────────────────────────────────────────────

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (p: string) => `asset://localhost/${p}`,
  invoke: vi.fn(),
}));

vi.mock("@/services", () => ({
  initializeServices: vi.fn().mockResolvedValue(undefined),
  getOrchestrator: vi.fn(() => ({
    getAllGames: vi.fn().mockResolvedValue([]),
    syncLibrary: vi.fn().mockResolvedValue({ total: 0, enriched: 0, errors: [] }),
  })),
  getInstallationService: vi.fn(() => ({
    installGame: vi.fn(),
    uninstallGame: vi.fn(),
  })),
  getGameLaunchService: vi.fn(() => ({
    launchFromCommand: vi.fn(),
  })),
}));

// Stub child components that have their own complex deps
vi.mock("@/components/game/GameCarousel.vue", () => ({
  default: {
    name: "GameCarousel",
    props: ["games", "selectedId", "playingId"],
    emits: ["select", "open"],
    template: '<div data-testid="game-carousel-stub" />',
    expose: ["scrollToSelected"],
    setup() {
      return { scrollToSelected: vi.fn() };
    },
  },
}));

vi.mock("@/components/layout", () => ({
  TopFilters: {
    name: "TopFilters",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div data-testid="top-filters-stub" />',
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGame(id: string, store = "epic") {
  return {
    id,
    info: { title: `Game ${id}` },
    storeData: { store, storeId: id },
    installation: { installed: false, installPath: "", executablePath: "" },
    assets: {
      heroPath: "",
      gridPath: "",
      horizontalGridPath: "",
      logoPath: "",
      iconPath: "",
      screenshotPaths: [],
    },
    gameCompletion: {
      lastPlayed: null,
      downloading: false,
      downloadProgress: 0,
      isFavorite: false,
    },
  } as any;
}

async function mountLibraryContent(initialGames: any[] = []) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: "/", component: { template: "<div/>" } }],
  });
  await router.push("/");
  await router.isReady();

  const pinia = createPinia();
  setActivePinia(pinia);

  const { useLibraryStore } = await import("@/stores/library");
  const store = useLibraryStore();
  store.games = initialGames;

  const LibraryContent = (await import("@/views/LibraryContent.vue")).default;

  const wrapper = mount(LibraryContent, {
    global: {
      plugins: [pinia, router],
    },
  });

  await flushPromises();
  await nextTick();

  return { wrapper, store };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LibraryContent – watch(filteredGames)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("empty games list → featuredGameId remains null", async () => {
    const { store } = await mountLibraryContent([]);
    expect(store.featuredGameId).toBeNull();
  });

  it("non-empty games list → auto-selects first game as featured", async () => {
    const games = [makeGame("first"), makeGame("second"), makeGame("third")];
    const { store } = await mountLibraryContent(games);
    expect(store.featuredGameId).toBe("first");
  });

  it("when games update to empty list → featuredGameId reset to null", async () => {
    const games = [makeGame("a"), makeGame("b")];
    const { store } = await mountLibraryContent(games);

    // Initially selected
    expect(store.featuredGameId).toBe("a");

    // Games become empty (e.g., filter wipes everything out)
    store.games = [];
    await nextTick();
    await flushPromises();

    expect(store.featuredGameId).toBeNull();
  });

  it("when games list changes and current selected game is no longer present → selects first of new list", async () => {
    const gamesA = [makeGame("old-1"), makeGame("old-2")];
    const { store } = await mountLibraryContent(gamesA);

    // First game is selected
    expect(store.featuredGameId).toBe("old-1");

    // Replace games with a completely different set
    store.games = [makeGame("new-1"), makeGame("new-2")];
    await nextTick();
    await flushPromises();

    expect(store.featuredGameId).toBe("new-1");
  });

  it("when games list changes but selected game is still present → keeps current selection", async () => {
    // NOTE: the "all" filter sorts by title ("Game <id>"), so ids must be
    // chosen such that the desired game sorts first alphabetically.
    // "aaa" < "zzz" alphabetically → "aaa" will be auto-selected on mount.
    const games = [makeGame("aaa"), makeGame("zzz")];
    const { store } = await mountLibraryContent(games);

    // "Game aaa" < "Game zzz" → first sorted is "aaa"
    expect(store.featuredGameId).toBe("aaa");

    // Add a new game ("mmm") but "aaa" is still present in the new list.
    // Sorted: "Game aaa" < "Game mmm" < "Game zzz" → currentStillVisible = true → no change.
    store.games = [makeGame("mmm"), makeGame("aaa"), makeGame("zzz")];
    await nextTick();
    await flushPromises();

    // "aaa" is still in the list → featuredGameId should remain "aaa"
    expect(store.featuredGameId).toBe("aaa");
  });
});
