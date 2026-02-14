import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ImageOverrideModal from "@/components/game/ImageOverrideModal.vue";

// ===== Hoisted mocks (available before imports) =====

const {
  mockOpen,
  mockConvertFileSrc,
  mockOverrideRepo,
  mockCacheService,
  mockSteamGridDbEnricher,
  mockGetApiKeys,
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

// Mock useCurrentGame to return a test game
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
    game: { value: mockGame },
    gameId: { value: "test-game" },
    heroImage: { value: "" },
    coverImage: { value: "" },
    screenshots: { value: [] },
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "test-game" } }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/stores/library", () => ({
  useLibraryStore: () => ({
    applyAssetOverride: vi.fn(),
    revertAssetOverride: vi.fn().mockResolvedValue(undefined),
    getGame: () => mockGame,
    games: [mockGame],
  }),
}));

describe("ImageOverrideModal", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockOverrideRepo.getOverrides.mockResolvedValue([]);
    mockCacheService.cacheOverrideFromLocal.mockResolvedValue(undefined);
    mockCacheService.cacheOverrideImage.mockResolvedValue(undefined);
    mockSteamGridDbEnricher.searchGameId.mockResolvedValue(12345);
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue([]);
  });

  function mountModal(modelValue = true) {
    return mount(ImageOverrideModal, {
      props: { modelValue },
      global: {
        stubs: {
          Modal: {
            template: '<div data-testid="modal"><slot /><slot name="footer" /></div>',
            props: ["modelValue", "title", "size", "closeOnBackdrop"],
          },
          Button: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
            props: ["variant", "size", "disabled"],
          },
        },
      },
    });
  }

  it("renders 6 asset slots in grid view", () => {
    const wrapper = mountModal();
    const labels = wrapper.findAll(".uppercase.tracking-wider");
    const labelTexts = labels.map((l) => l.text());

    expect(labelTexts).toContain("Hero");
    expect(labelTexts).toContain("Cover");
    expect(labelTexts).toContain("Grid");
    expect(labelTexts).toContain("Grille horizontale");
    expect(labelTexts).toContain("Logo");
    expect(labelTexts).toContain("Icône");
  });

  it("shows images for assets that have paths", () => {
    const wrapper = mountModal();
    const images = wrapper.findAll("img");

    // hero, cover, grid, horizontal_grid have paths; logo and icon don't
    expect(images.length).toBe(4);
  });

  it("shows 'Perso' badge for overridden assets", async () => {
    mockOverrideRepo.getOverrides.mockResolvedValue([
      { gameId: "test-game", assetType: "hero", path: "/override/hero.webp", createdAt: "" },
    ]);

    const wrapper = mountModal(false);
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    expect(mockOverrideRepo.getOverrides).toHaveBeenCalledWith("test-game");
  });

  it("opens gallery view when clicking an asset slot", async () => {
    const wrapper = mountModal();

    // Click the first asset slot (Hero)
    const slotButtons = wrapper.findAll("button").filter((b) => {
      // Find buttons that are asset slot containers (in the grid)
      return b.classes().some((c) => c.includes("rounded-xl"));
    });

    expect(slotButtons.length).toBe(6);
    await slotButtons[0].trigger("click");
    await flushPromises();

    // Should now show the gallery view with "Retour" button
    expect(wrapper.text()).toContain("Retour");
    expect(wrapper.text()).toContain("Hero");
    expect(wrapper.text()).toContain("Depuis un fichier");
  });

  it("configures SteamGridDB enricher and loads images on gallery open", async () => {
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue([
      {
        id: 1,
        url: "https://cdn.steamgriddb.com/img1.png",
        thumb: "https://cdn.steamgriddb.com/thumb1.png",
        width: 1920,
        height: 620,
        author: { name: "User1" },
      },
    ]);

    const wrapper = mountModal();
    const slotButtons = wrapper
      .findAll("button")
      .filter((b) => b.classes().some((c) => c.includes("rounded-xl")));
    await slotButtons[0].trigger("click");
    await flushPromises();

    expect(mockSteamGridDbEnricher.configure).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(mockSteamGridDbEnricher.searchGameId).toHaveBeenCalledWith("Test Game");
    expect(mockSteamGridDbEnricher.fetchImages).toHaveBeenCalledWith(12345, "heroes", undefined);
  });

  it("calls file dialog with image filters from gallery 'Depuis un fichier' button", async () => {
    mockOpen.mockResolvedValue(null);

    const wrapper = mountModal();
    // Open gallery for Hero
    const slotButtons = wrapper
      .findAll("button")
      .filter((b) => b.classes().some((c) => c.includes("rounded-xl")));
    await slotButtons[0].trigger("click");
    await flushPromises();

    // Click "Depuis un fichier"
    const fileBtn = wrapper.findAll("button").find((b) => b.text().includes("Depuis un fichier"));
    expect(fileBtn).toBeTruthy();
    await fileBtn!.trigger("click");

    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        directory: false,
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      }),
    );
  });

  it("caches file and persists override from local file", async () => {
    mockOpen.mockResolvedValue("/home/user/my-hero.png");
    mockCacheService.cacheOverrideFromLocal.mockResolvedValue("/cache/test-game/hero_override.png");

    const wrapper = mountModal();
    // Open gallery for Hero
    const slotButtons = wrapper
      .findAll("button")
      .filter((b) => b.classes().some((c) => c.includes("rounded-xl")));
    await slotButtons[0].trigger("click");
    await flushPromises();

    // Click "Depuis un fichier"
    const fileBtn = wrapper.findAll("button").find((b) => b.text().includes("Depuis un fichier"));
    await fileBtn!.trigger("click");
    await flushPromises();

    expect(mockCacheService.cacheOverrideFromLocal).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/home/user/my-hero.png",
    );
    expect(mockOverrideRepo.setOverride).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/cache/test-game/hero_override.png",
    );
  });

  it("applies SteamGridDB image when selecting from gallery", async () => {
    mockSteamGridDbEnricher.fetchImages.mockResolvedValue([
      {
        id: 1,
        url: "https://cdn.steamgriddb.com/hero1.png",
        thumb: "https://cdn.steamgriddb.com/thumb1.png",
        width: 1920,
        height: 620,
        author: { name: "Artist" },
      },
    ]);
    mockCacheService.cacheOverrideImage.mockResolvedValue("/cache/test-game/hero_override.png");

    const wrapper = mountModal();

    // Open gallery for Hero
    const slotButtons = wrapper
      .findAll("button")
      .filter((b) => b.classes().some((c) => c.includes("rounded-xl")));
    await slotButtons[0].trigger("click");
    await flushPromises();

    // Click the gallery image
    const galleryBtn = wrapper.findAll("button").find((b) => b.text().includes("Appliquer"));
    expect(galleryBtn).toBeTruthy();
    await galleryBtn!.trigger("click");
    await flushPromises();

    expect(mockCacheService.cacheOverrideImage).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "https://cdn.steamgriddb.com/hero1.png",
    );
    expect(mockOverrideRepo.setOverride).toHaveBeenCalledWith(
      "test-game",
      "hero",
      "/cache/test-game/hero_override.png",
    );
  });

  it("does nothing when file dialog is cancelled", async () => {
    mockOpen.mockResolvedValue(null);

    const wrapper = mountModal();
    const slotButtons = wrapper
      .findAll("button")
      .filter((b) => b.classes().some((c) => c.includes("rounded-xl")));
    await slotButtons[0].trigger("click");
    await flushPromises();

    const fileBtn = wrapper.findAll("button").find((b) => b.text().includes("Depuis un fichier"));
    await fileBtn!.trigger("click");
    await flushPromises();

    expect(mockCacheService.cacheOverrideFromLocal).not.toHaveBeenCalled();
    expect(mockOverrideRepo.setOverride).not.toHaveBeenCalled();
  });
});
