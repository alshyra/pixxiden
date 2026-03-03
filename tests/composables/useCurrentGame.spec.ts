/**
 * Tests for useCurrentGame composable
 * Validates the fallback chain: route.params.id → featuredGameId → ""
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${path}`,
  invoke: vi.fn(),
}));

vi.mock("@/services", () => ({
  getInstallationService: vi.fn(() => ({
    installGame: vi.fn(),
    uninstallGame: vi.fn(),
  })),
  getGameLaunchService: vi.fn(() => ({
    launchFromCommand: vi.fn(),
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGame(id: string) {
  return {
    id,
    info: { title: `Game ${id}` },
    storeData: { store: "epic", storeId: id },
    installation: { installed: false, installPath: "", executablePath: "" },
    assets: {
      heroPath: `/cache/${id}/hero.jpg`,
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

/**
 * Mount a wrapper component to exercise useCurrentGame in a real Vue context
 * with the given route and pinia state.
 */
async function mountWrapper(opts: {
  routePath: string;
  games?: ReturnType<typeof makeGame>[];
  featuredGameId?: string | null;
}) {
  const { routePath, games = [], featuredGameId = null } = opts;

  const routes = [
    { path: "/", component: { template: "<div />" } },
    { path: "/game/:id", component: { template: "<div />" } },
  ];

  const router = createRouter({ history: createWebHistory(), routes });
  await router.push(routePath);
  await router.isReady();

  const pinia = createPinia();
  setActivePinia(pinia);

  // Pre-populate library store before component mounts
  const { useLibraryStore } = await import("@/stores/library");
  const store = useLibraryStore();
  store.games = games;
  if (featuredGameId !== undefined) {
    store.featuredGameId = featuredGameId;
  }

  const { useCurrentGame } = await import("@/composables/useCurrentGame");

  let capturedGameId: string = "NOT_SET";
  let capturedGame: any = "NOT_SET";

  const TestComponent = defineComponent({
    setup() {
      const { gameId, game } = useCurrentGame();
      capturedGameId = gameId.value;
      capturedGame = game.value;
      return {};
    },
    template: "<div />",
  });

  await mount(TestComponent, { global: { plugins: [router, pinia] } });

  return { capturedGameId, capturedGame };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useCurrentGame – gameId fallback chain", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns game from route.params.id when it is defined", async () => {
    const game1 = makeGame("abc");
    const { capturedGameId, capturedGame } = await mountWrapper({
      routePath: "/game/abc",
      games: [game1],
    });

    expect(capturedGameId).toBe("abc");
    expect(capturedGame).toEqual(game1);
  });

  it("falls back to featuredGameId when route.params.id is absent", async () => {
    const game1 = makeGame("featured-1");
    const { capturedGameId, capturedGame } = await mountWrapper({
      routePath: "/",
      games: [game1],
      featuredGameId: "featured-1",
    });

    expect(capturedGameId).toBe("featured-1");
    expect(capturedGame).toEqual(game1);
  });

  it("returns empty string when both route param and featuredGameId are absent", async () => {
    const { capturedGameId, capturedGame } = await mountWrapper({
      routePath: "/",
      games: [],
      featuredGameId: null,
    });

    expect(capturedGameId).toBe("");
    expect(capturedGame).toBeUndefined();
  });

  it("prefers route.params.id over featuredGameId when both are set", async () => {
    const gameRoute = makeGame("route-game");
    const gameFeatured = makeGame("featured-game");
    const { capturedGameId, capturedGame } = await mountWrapper({
      routePath: "/game/route-game",
      games: [gameRoute, gameFeatured],
      featuredGameId: "featured-game",
    });

    expect(capturedGameId).toBe("route-game");
    expect(capturedGame).toEqual(gameRoute);
  });
});
