import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameRepository } from "@/lib/database/GameRepository";
import type { Game } from "@/types";

const makeRow = () => ({
  id: "game-1",
  title: "Test Game",
  description: "desc",
  summary: "sum",
  metacritic_score: 88,
  igdb_rating: 80,
  developer: "Dev",
  publisher: "Pub",
  genres: JSON.stringify(["RPG"]),
  release_date: "2024-01-01",
  hero_path: "hero",
  cover_path: "cover",
  grid_path: "grid",
  horizontal_grid_path: "hgrid",
  logo_path: "logo",
  icon_path: "icon",
  screenshot_paths: JSON.stringify(["s1"]),
  background_url: "bg",
  installed: 1,
  install_path: "/games/test",
  install_size: "10GB",
  custom_executable: "",
  wine_prefix: "wp",
  wine_version: "wv",
  executable_path: "/games/test/test.exe",
  runner: "proton",
  runner_path: "/runner",
  cloud_save_support: 1,
  hltb_main: 10,
  hltb_main_extra: 15,
  hltb_complete: 20,
  achievements_total: 100,
  achievements_unlocked: 50,
  play_time_minutes: 42,
  last_played: "2024-02-01",
  is_favorite: 1,
  downloading: 0,
  download_progress: 20,
  proton_tier: "gold",
  proton_confidence: "high",
  proton_trending_tier: "silver",
  steam_app_id: 123,
  store: "epic",
  store_id: "epic-1",
  created_at: "2024-01-01",
  updated_at: "2024-01-02",
  enriched_at: "2024-01-03",
});

const makeGame = (): Game => ({
  id: "game-1",
  info: {
    title: "Test Game",
    description: "",
    summary: "",
    metacriticScore: 0,
    igdbRating: 0,
    developer: "",
    publisher: "",
    genres: [],
    releaseDate: "",
  },
  assets: {
    heroPath: "",
    coverPath: "",
    gridPath: "",
    horizontalGridPath: "",
    logoPath: "",
    iconPath: "",
    screenshotPaths: [],
    backgroundUrl: "",
  },
  installation: {
    installed: true,
    installPath: "/games/test",
    installSize: "10GB",
    customExecutable: "",
    winePrefix: "",
    wineVersion: "",
    executablePath: "/games/test/test.exe",
    customExecutablePath: "",
    runner: "",
    runnerPath: "",
    cloudSaveSupport: true,
  },
  gameCompletion: {
    timeToBeatHastily: 0,
    timeToBeatNormally: 0,
    timeToBeatCompletely: 0,
    playTimeMinutes: 10,
    isFavorite: false,
  },
  protonData: {
    protonTier: "pending",
    protonConfidence: "",
    protonTrendingTier: "",
    steamAppId: 0,
  },
  storeData: {
    store: "epic",
    storeId: "epic-1",
  },
  createdAt: "2024-01-01",
  updatedAt: "2024-01-02",
});

describe("GameRepository", () => {
  const db = {
    queryOne: vi.fn(),
    select: vi.fn(),
    execute: vi.fn(),
  };

  let repository: GameRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new (GameRepository as unknown as new (db: never) => GameRepository)(db as never);
    (GameRepository as unknown as { instance: GameRepository | null }).instance = null;
  });

  it("reads and maps game queries", async () => {
    const row = makeRow();
    // First select: getAllGames rows, Second select: overrides for getAllGames,
    // Third select: overrides for getGameById
    db.select.mockResolvedValueOnce([row]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    db.queryOne.mockResolvedValueOnce(row);

    const all = await repository.getAllGames();
    const one = await repository.getGameById("game-1");

    expect(all).toHaveLength(1);
    expect(all[0].info.title).toBe("Test Game");
    expect(all[0].assets.screenshotPaths).toEqual(["s1"]);
    expect(one?.storeData.store).toBe("epic");
  });

  it("returns null when game not found", async () => {
    db.queryOne.mockResolvedValue(null);
    await expect(repository.getGameById("missing")).resolves.toBeNull();
  });

  it("supports listing helpers", async () => {
    const row = makeRow();
    db.select.mockResolvedValue([row]);
    db.queryOne.mockResolvedValueOnce({ count: 10 }).mockResolvedValueOnce(null);

    const byStore = await repository.getGamesByStore("epic");
    const count = await repository.getGamesCount();
    const fallbackCount = await repository.getGamesCount();
    const unenriched = await repository.getUnenrichedGames();
    const recent = await repository.getRecentlyPlayed(3);
    const favorites = await repository.getFavorites();
    const search = await repository.searchGames("test");

    expect(byStore).toHaveLength(1);
    expect(count).toBe(10);
    expect(fallbackCount).toBe(0);
    expect(unenriched).toHaveLength(1);
    expect(recent).toHaveLength(1);
    expect(favorites).toHaveLength(1);
    expect(search).toHaveLength(1);
    expect(db.select).toHaveBeenCalledWith(
      "SELECT * FROM games WHERE store = ? ORDER BY title ASC",
      ["epic"],
    );
  });

  it("upserts one or many games", async () => {
    const game = makeGame();

    await repository.upsertGame(game);
    await repository.upsertGames([game, { ...game, id: "game-2" }]);
    await repository.upsertGames([]);

    expect(db.execute).toHaveBeenCalled();
    expect(db.execute.mock.calls[0]?.[0]).toContain("INSERT INTO games");
    expect(db.execute.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(["game-1", "epic-1", "epic"]),
    );
  });

  it("updates enrichment and skips empty payload", async () => {
    await repository.updateEnrichment("game-1", {
      hero_path: "hero",
      screenshot_paths: ["a", "b"],
      ignored: undefined,
    });
    await repository.updateEnrichment("game-1", { ignored: undefined });

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute.mock.calls[0]?.[0]).toContain("UPDATE games SET");
  });

  it("updates metadata conditionally", async () => {
    await repository.updateMetadata("game-1", {
      isFavorite: true,
      playTimeMinutes: 120,
      lastPlayed: "2024-03-01",
    });
    await repository.updateMetadata("game-1", {});

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute.mock.calls[0]?.[0]).toContain("is_favorite = ?");
    expect(db.execute.mock.calls[0]?.[0]).toContain("play_time_minutes = ?");
    expect(db.execute.mock.calls[0]?.[0]).toContain("last_played = ?");
  });

  it("updates installation and deletes game", async () => {
    await repository.updateInstallation("game-1", {
      installed: true,
      installPath: "/new/path",
      installSize: "12GB",
      winePrefix: "wp",
      wineVersion: "wv",
      runner: "proton",
      runnerPath: "/runner",
      executablePath: "/new/path/game.exe",
    });
    await repository.deleteGame("game-1");

    expect(db.execute.mock.calls[0]?.[0]).toContain("UPDATE games SET");
    expect(db.execute).toHaveBeenLastCalledWith("DELETE FROM games WHERE id = ?", ["game-1"]);
  });
});
