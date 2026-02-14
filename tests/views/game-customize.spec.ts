import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref, computed } from "vue";

// ===== Hoisted mocks =====
const {
  mockOpen,
  mockConvertFileSrc,
  mockOverrideRepo,
  mockCacheService,
  mockSteamGridDbEnricher,
  mockGetApiKeys,
  mockRouterPush,
  mockRouterBack,
} = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockConvertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  mockOverrideRepo: {
    getOverrides: vi.fn().mockResolvedValue([]),
    setOverride: vi.fn().mockResolvedValue(undefined),
    removeOverride: vi.fn().mockResolvedValue(undefined),
  },
  mockCacheService: {
    cacheOverrideFromLocal: vi.fn(),
    cacheOverrideImage: vi.fn(),
  },
  mockSteamGridDbEnricher: {
    configure: vi.fn(),
    searchGameId: vi.fn().mockResolvedValue(12345),
    fetchImages: vi.fn().mockResolvedValue([]),
  },
  mockGetApiKeys: vi.fn().mockResolvedValue({ steamgriddbApiKey: "test-key" }),
  mockRouterPush: vi.fn(),
  mockRouterBack: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => mockConvertFileSrc(path),
}));

vi.mock("@/lib/database/ImageOverrideRepository", () => ({
  ImageOverrideRepository: {
    getInstance: () => mockOverrideRepo,
  },
}));

vi.mock("@/services/enrichment/ImageCacheService", () => ({
  ImageCacheService: {
    getInstance: () => mockCacheService,
  },
}));

vi.mock("@/services/enrichment/SteamGridDbEnricher", () => ({
  SteamGridDbEnricher: function () {
    return mockSteamGridDbEnricher;
  },
}));

vi.mock("@/services/api", () => ({
  getApiKeys: mockGetApiKeys,
}));

const mockGame = {
  id: "test-game",
  info: { title: "Test Game" },
  assets: {
    heroPath: "/cache/test-game/hero.jpg",
    coverPath: "/cache/test-game/cover.jpg",
    gridPath: "/cache/test-game/grid.jpg",
    horizontalGridPath: "/cache/test-game/hgrid.jpg",
    logoPath: "",
    iconPath: "",
    screenshotPaths: [],
    backgroundUrl: "",
  },
};

vi.mock("@/composables/useCurrentGame", () => ({
  useCurrentGame: () => ({
    game: ref(mockGame),
    gameId: computed(() => "test-game"),
    heroImage: ref(""),
    coverImage: ref(""),
    screenshots: ref([]),
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "test-game" } }),
  useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
}));

const mockApplyAssetOverride = vi.fn();
const mockRevertAssetOverride = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/library", () => ({
  useLibraryStore: () => ({
    applyAssetOverride: mockApplyAssetOverride,
    revertAssetOverride: mockRevertAssetOverride,
    getGame: () => mockGame,
    games: [mockGame],
  }),
}));

vi.mock("@/stores/sideNav", () => ({
  useSideNavStore: () => ({
    isOpen: false,
  }),
}));

vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({
    on: vi.fn(),
    state: { value: { connected: false, type: "keyboard", name: "" } },
    BUTTONS: {},
    AXES: {},
  }),
}));

import GameCustomize from "@/views/GameCustomize.vue";

describe("GameCustomize", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockOverrideRepo.getOverrides.mockResolvedValue([]);
    mockCacheService.cacheOverrideFromLocal.mockResolvedValue(undefined);
    mockCacheService.cacheOverrideImage.mockResolvedValue(undefined);
    mockSteamGridDbEnricher.searchGameId.mockResolvedValue(12345);
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountView() {
    return mount(GameCustomize, {
      global: {
        stubs: {
          // Stub sub-components with functional equivalents
          AssetSlotGrid: {
            template: `
              <div data-testid="asset-slot-grid">
                <button
                  v-for="(slot, idx) in slots"
                  :key="slot.type"
                  data-testid="asset-slot"
                  @click="$emit('select', slot, idx)"
                >{{ slot.label }}</button>
              </div>
            `,
            props: ["slots", "overriddenTypes", "focusedIndex"],
            emits: ["select"],
          },
          SteamGridGallery: {
            template: `
              <div data-testid="steam-grid-gallery">
                <span>{{ slotLabel }}</span>
                <button data-testid="gallery-from-file" @click="$emit('from-file')">Depuis un fichier</button>
                <button v-if="isOverridden" data-testid="gallery-reset" @click="$emit('reset')">Réinitialiser</button>
                <button
                  v-for="(img, idx) in images"
                  :key="idx"
                  class="gallery-item"
                  @click="$emit('select-image', idx)"
                >img-{{ idx }}</button>
              </div>
            `,
            props: [
              "slotLabel",
              "currentSrc",
              "images",
              "loading",
              "isOverridden",
              "disabled",
              "focusedIndex",
            ],
            emits: ["select-image", "from-file", "reset", "focus"],
          },
          Caroussel: {
            template: '<div data-testid="carousel">Carousel</div>',
            props: ["modelValue", "images"],
          },
          Button: {
            template:
              '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
            props: ["variant", "size", "disabled", "iconOnly", "loading"],
            emits: ["click"],
          },
        },
      },
    });
  }

  // === Level 1: Asset Slots ===

  it("renders the page with game title", () => {
    const wrapper = mountView();
    expect(wrapper.find("[data-testid='game-customize']").exists()).toBe(true);
    expect(wrapper.text()).toContain("Test Game");
    expect(wrapper.text()).toContain("Personnaliser les images");
  });

  it("renders AssetSlotGrid with 6 slots", () => {
    const wrapper = mountView();
    expect(wrapper.find("[data-testid='asset-slot-grid']").exists()).toBe(true);
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    expect(slots.length).toBe(6);
  });

  it("loads overrides on mount", async () => {
    mountView();
    await flushPromises();
    expect(mockOverrideRepo.getOverrides).toHaveBeenCalledWith("test-game");
  });

  // === Level 2: Gallery ===

  it("opens gallery when selecting an asset slot", async () => {
    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");

    await slots[0].trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='steam-grid-gallery']").exists()).toBe(true);
    expect(mockSteamGridDbEnricher.configure).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(mockSteamGridDbEnricher.searchGameId).toHaveBeenCalledWith("Test Game");
  });

  it("shows gallery images from SteamGridDB", async () => {
    const testImages = [
      {
        id: 1,
        url: "https://cdn.sgdb.steamgriddb.com/1.png",
        thumb: "https://cdn.sgdb.steamgriddb.com/thumb1.png",
        width: 1920,
        height: 620,
      },
      {
        id: 2,
        url: "https://cdn.sgdb.steamgriddb.com/2.png",
        thumb: "https://cdn.sgdb.steamgriddb.com/thumb2.png",
        width: 1920,
        height: 620,
      },
    ];
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue(testImages);

    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const galleryItems = wrapper.findAll(".gallery-item");
    expect(galleryItems.length).toBe(2);
  });

  it("handles file import from gallery and returns to slots", async () => {
    mockOpen.mockResolvedValue("/path/to/custom-hero.png");
    mockCacheService.cacheOverrideFromLocal.mockResolvedValue("/cached/hero.webp");

    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const fileBtn = wrapper.find("[data-testid='gallery-from-file']");
    await fileBtn.trigger("click");
    await flushPromises();

    expect(mockOpen).toHaveBeenCalled();
    expect(mockCacheService.cacheOverrideFromLocal).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/path/to/custom-hero.png",
    );
    expect(mockOverrideRepo.setOverride).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/cached/hero.webp",
    );
    expect(mockApplyAssetOverride).toHaveBeenCalledWith("test-game", "hero", "/cached/hero.webp");

    // After delay, navigates back to slots
    vi.advanceTimersByTime(600);
    await flushPromises();

    expect(wrapper.find("[data-testid='asset-slot-grid']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='steam-grid-gallery']").exists()).toBe(false);
  });

  // === Level 3: Carousel ===

  it("opens carousel when selecting a gallery image", async () => {
    const testImages = [
      {
        id: 1,
        url: "https://cdn.sgdb.steamgriddb.com/1.png",
        thumb: "https://cdn.sgdb.steamgriddb.com/thumb1.png",
        width: 1920,
        height: 620,
      },
      {
        id: 2,
        url: "https://cdn.sgdb.steamgriddb.com/2.png",
        thumb: "https://cdn.sgdb.steamgriddb.com/thumb2.png",
        width: 1920,
        height: 620,
      },
    ];
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue(testImages);

    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const gallery = wrapper.find("[data-testid='steam-grid-gallery']");
    expect(gallery.exists()).toBe(true);
    const galleryItems = wrapper.findAll(".gallery-item");
    expect(galleryItems.length).toBe(2);

    await galleryItems[1].trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='carousel']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='carousel-apply']").exists()).toBe(true);
  });

  it("applies image from carousel and returns to slots", async () => {
    const testImages = [
      {
        id: 1,
        url: "https://cdn.sgdb.steamgriddb.com/full1.png",
        thumb: "https://cdn.sgdb.steamgriddb.com/thumb1.png",
        width: 1920,
        height: 620,
      },
    ];
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue(testImages);
    mockCacheService.cacheOverrideImage.mockResolvedValue("/cached/hero-override.webp");

    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const galleryItems = wrapper.findAll(".gallery-item");
    await galleryItems[0].trigger("click");
    await flushPromises();

    const applyBtn = wrapper.find("[data-testid='carousel-apply']");
    await applyBtn.trigger("click");
    await flushPromises();

    expect(mockCacheService.cacheOverrideImage).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "https://cdn.sgdb.steamgriddb.com/full1.png",
    );
    expect(mockOverrideRepo.setOverride).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/cached/hero-override.webp",
    );
    expect(mockApplyAssetOverride).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/cached/hero-override.webp",
    );

    // Brief confirmation visible
    expect(wrapper.find("[data-testid='carousel-apply']").text()).toContain("Appliqué");

    // After delay, navigates back to slots
    vi.advanceTimersByTime(800);
    await flushPromises();

    expect(wrapper.find("[data-testid='asset-slot-grid']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='carousel']").exists()).toBe(false);
  });

  // === Navigation ===

  it("navigates back from gallery to slots", async () => {
    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='steam-grid-gallery']").exists()).toBe(true);

    const backBtn = wrapper.find("[data-testid='customize-back']");
    await backBtn.trigger("click");

    expect(wrapper.find("[data-testid='asset-slot-grid']").exists()).toBe(true);
  });

  it("navigates back from carousel to gallery", async () => {
    const testImages = [
      {
        id: 1,
        url: "https://cdn.sgdb.steamgriddb.com/1.png",
        thumb: "t1.png",
        width: 1920,
        height: 620,
      },
    ];
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue(testImages);

    const wrapper = mountView();
    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const galleryItems = wrapper.findAll(".gallery-item");
    await galleryItems[0].trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='carousel']").exists()).toBe(true);

    const backBtn = wrapper.find("[data-testid='customize-back']");
    await backBtn.trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-testid='carousel']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='steam-grid-gallery']").exists()).toBe(true);
  });

  it("calls router.back when pressing back on slots level", async () => {
    const wrapper = mountView();
    const backBtn = wrapper.find("[data-testid='customize-back']");
    await backBtn.trigger("click");
    expect(mockRouterBack).toHaveBeenCalled();
  });

  // === Reset ===

  it("resets overridden image from gallery", async () => {
    mockOverrideRepo.getOverrides.mockResolvedValue([
      { gameId: "test-game", assetType: "hero", path: "/override/hero.webp", createdAt: "" },
    ]);

    const wrapper = mountView();
    await flushPromises();

    const slots = wrapper.findAll("[data-testid='asset-slot']");
    await slots[0].trigger("click");
    await flushPromises();

    const resetBtn = wrapper.find("[data-testid='gallery-reset']");
    expect(resetBtn.exists()).toBe(true);

    await resetBtn.trigger("click");
    await flushPromises();

    expect(mockOverrideRepo.removeOverride).toHaveBeenCalledWith("test-game", "hero");
    expect(mockRevertAssetOverride).toHaveBeenCalledWith("test-game");
  });
});
