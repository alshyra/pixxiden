import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useLibraryStore } from "@/stores/library";

const mockInitializeServices = vi.fn();
const mockEmit = vi.fn();

const mockOrchestrator = {
  getAllGames: vi.fn(),
  syncLibrary: vi.fn(),
  resyncLibrary: vi.fn(),
  prepareGameLaunch: vi.fn(),
  updateGameMetadata: vi.fn(),
  searchGames: vi.fn(),
  getRecentlyPlayed: vi.fn(),
  getFavorites: vi.fn(),
  updateExecutablePath: vi.fn(),
};

const mockInstallationService = {
  installGame: vi.fn(),
  uninstallGame: vi.fn(),
};

const mockGameLaunchService = {
  launchFromCommand: vi.fn(),
};

vi.mock("@tauri-apps/api/event", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

vi.mock("@/services", () => ({
  initializeServices: () => mockInitializeServices(),
  getOrchestrator: () => mockOrchestrator,
  getInstallationService: () => mockInstallationService,
  getGameLaunchService: () => mockGameLaunchService,
}));

function makeGame(id = "g1") {
  return {
    id,
    storeData: { store: "epic", storeId: id },
    installation: {
      installed: false,
      installPath: "",
      executablePath: "",
    },
    gameCompletion: {
      lastPlayed: null,
      downloading: false,
      downloadProgress: 0,
      isFavorite: false,
    },
  } as any;
}

describe("Library Store (real store)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockOrchestrator.getAllGames.mockResolvedValue([makeGame("g1"), makeGame("g2")]);
    mockOrchestrator.syncLibrary.mockResolvedValue({
      total: 2,
      enriched: 1,
      errors: [{ store: "epic", message: "minor" }],
    });
    mockOrchestrator.resyncLibrary.mockResolvedValue({
      total: 2,
      enriched: 2,
      errors: [],
    });
    mockOrchestrator.searchGames.mockResolvedValue([makeGame("g1")]);
    mockOrchestrator.getRecentlyPlayed.mockResolvedValue([makeGame("g2")]);
    mockOrchestrator.getFavorites.mockResolvedValue([makeGame("g2")]);
    mockOrchestrator.updateGameMetadata.mockResolvedValue(undefined);
    mockOrchestrator.updateExecutablePath.mockResolvedValue(undefined);
    mockOrchestrator.prepareGameLaunch.mockResolvedValue({
      game: makeGame("g1"),
      launchCommand: "run-game",
      env: { TEST: "1" },
    });

    mockInstallationService.installGame.mockResolvedValue(undefined);
    mockInstallationService.uninstallGame.mockResolvedValue(undefined);
    mockGameLaunchService.launchFromCommand.mockResolvedValue(undefined);
  });

  it("initializes once and fetches games", async () => {
    const store = useLibraryStore();

    await store.fetchGames();

    expect(mockInitializeServices).toHaveBeenCalledTimes(1);
    expect(store.games).toHaveLength(2);
    expect(store.loading).toBe(false);

    await store.fetchGames();
    expect(mockInitializeServices).toHaveBeenCalledTimes(1);
  });

  it("syncs library and maps sync errors", async () => {
    const store = useLibraryStore();

    await store.syncLibrary();

    expect(mockOrchestrator.syncLibrary).toHaveBeenCalled();
    expect(store.syncErrors).toEqual(["epic: minor"]);
    expect(store.games).toHaveLength(2);
    expect(store.syncing).toBe(false);
  });

  it("resyncs library", async () => {
    const store = useLibraryStore();

    await store.resyncLibrary();

    expect(mockOrchestrator.resyncLibrary).toHaveBeenCalled();
    expect(store.syncErrors).toEqual([]);
    expect(store.loading).toBe(false);
  });

  it("launches game and emits game-launched", async () => {
    const store = useLibraryStore();
    await store.fetchGames();

    await store.launchGame("g1");

    expect(mockOrchestrator.prepareGameLaunch).toHaveBeenCalledWith("g1");
    expect(mockGameLaunchService.launchFromCommand).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith(
      "game-launched",
      expect.objectContaining({ gameId: "g1" }),
    );
    expect(mockOrchestrator.updateGameMetadata).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({ lastPlayed: expect.any(String) }),
    );
  });

  it("emits game-launch-error when launch fails", async () => {
    const store = useLibraryStore();
    mockOrchestrator.prepareGameLaunch.mockRejectedValueOnce(new Error("launch failed"));

    await expect(store.launchGame("g1")).rejects.toThrow("launch failed");
    expect(store.error).toBe("Failed to launch game");
    expect(mockEmit).toHaveBeenCalledWith("game-launch-error", { gameId: "g1" });
  });

  it("installs and updates progress/install state", async () => {
    const store = useLibraryStore();
    await store.fetchGames();

    mockInstallationService.installGame.mockImplementationOnce(
      async (_id: string, _store: string, options: { onProgress: (p: any) => void }) => {
        options.onProgress({ progress: 45, status: "downloading" });
        options.onProgress({ progress: 100, status: "completed" });
      },
    );

    await store.installGame("g1", "/games/g1");

    const game = store.games.find((g) => g.id === "g1") as any;
    expect(game.gameCompletion.downloadProgress).toBe(100);
    expect(game.gameCompletion.downloading).toBe(false);
    expect(game.installation.installed).toBe(true);
    expect(game.installation.installPath).toBe("/games/g1");
  });

  it("throws when installing unknown game", async () => {
    const store = useLibraryStore();

    await expect(store.installGame("unknown")).rejects.toThrow("Game not found");
    expect(store.error).toBe("Failed to install game");
  });

  it("uninstalls game and updates local state", async () => {
    const store = useLibraryStore();
    await store.fetchGames();
    const game = store.games.find((g) => g.id === "g1") as any;
    game.installation.installed = true;
    game.installation.installPath = "/games/g1";

    await store.uninstallGame("g1");

    expect(mockInstallationService.uninstallGame).toHaveBeenCalledWith("g1", "epic");
    expect(game.installation.installed).toBe(false);
    expect(game.installation.installPath).toBe("");
  });

  it("supports search/recent/favorites and metadata updates", async () => {
    const store = useLibraryStore();
    await store.fetchGames();

    const search = await store.searchGames("g");
    const recent = await store.getRecentlyPlayed(5);
    const favorites = await store.getFavorites();

    expect(search).toHaveLength(1);
    expect(recent).toHaveLength(1);
    expect(favorites).toHaveLength(1);

    await store.toggleFavorite("g1");
    expect(mockOrchestrator.updateGameMetadata).toHaveBeenCalledWith("g1", { isFavorite: true });

    await store.updateExecutablePath("g1", "/bin/game.exe");
    expect(mockOrchestrator.updateExecutablePath).toHaveBeenCalledWith("g1", "/bin/game.exe");
    expect((store.games.find((g) => g.id === "g1") as any).installation.executablePath).toBe(
      "/bin/game.exe",
    );
  });

  it("selects game by id and returns computed getGame", async () => {
    const store = useLibraryStore();
    await store.fetchGames();

    store.selectGameById("g2");

    expect(store.selectedGame?.id).toBe("g2");
    expect(store.getGame("g1")?.id).toBe("g1");
  });
});
