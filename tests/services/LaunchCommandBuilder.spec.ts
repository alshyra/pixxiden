/**
 * Tests for LaunchCommandBuilder — décision centralisée de lancement
 *
 * Contrat après simplification :
 * - Non-steam + umuId + executablePath → umu-run via UmuLauncherService.buildDirectLaunch
 * - Non-steam + umuId manquant → fallback stratégie par store (legendary/gogdl/nile)
 * - Non-steam + executablePath manquant → fallback stratégie par store
 * - Steam → stratégie steam (inchangé)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGame } from "@/types";

// vi.hoisted garantit que ces mocks sont disponibles avant le hoisting des vi.mock()
const mocks = vi.hoisted(() => ({
  // GameRepository
  getGameById: vi.fn(),
  // UmuLauncherService
  buildDirectLaunch: vi.fn(),
  // ProtonService
  ensureProtonInstalled: vi.fn(),
  checkSystemPrerequisites: vi.fn(),
  getPrefixesDir: vi.fn(),
  getRunnersDir: vi.fn(),
  // Strategies
  epicBuildCommand: vi.fn(),
  epicBuildEnv: vi.fn(),
  gogBuildCommand: vi.fn(),
  gogBuildEnv: vi.fn(),
  amazonBuildCommand: vi.fn(),
  amazonBuildEnv: vi.fn(),
  steamBuildCommand: vi.fn(),
  steamBuildEnv: vi.fn(),
}));

// ---- Mocks Tauri ----
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

// ---- Mock GameRepository ----
vi.mock("@/lib/database", () => ({
  GameRepository: {
    getInstance: () => ({ getGameById: mocks.getGameById }),
  },
}));

// ---- Mock UmuLauncherService ----
vi.mock("@/services/runners/UmuLauncherService", () => ({
  UmuLauncherService: {
    getInstance: () => ({ buildDirectLaunch: mocks.buildDirectLaunch }),
  },
}));

// ---- Mock ProtonService (pour chemin fallback uniquement) ----
vi.mock("@/services/runners", () => ({
  ProtonService: {
    getInstance: () => ({
      ensureProtonInstalled: mocks.ensureProtonInstalled,
      checkSystemPrerequisites: mocks.checkSystemPrerequisites,
      getPrefixesDir: mocks.getPrefixesDir,
      getRunnersDir: mocks.getRunnersDir,
    }),
  },
}));

// ---- Mock strategies (constructeurs) ----
// Note: les regular function() sont constructibles, contrairement aux arrow functions
vi.mock("@/services/launch/strategies/EpicLaunchStrategy", () => ({
  EpicLaunchStrategy: function EpicLaunchStrategy() {
    return { buildCommand: mocks.epicBuildCommand, buildEnv: mocks.epicBuildEnv };
  },
}));
vi.mock("@/services/launch/strategies/GogLaunchStrategy", () => ({
  GogLaunchStrategy: function GogLaunchStrategy() {
    return { buildCommand: mocks.gogBuildCommand, buildEnv: mocks.gogBuildEnv };
  },
}));
vi.mock("@/services/launch/strategies/AmazonLaunchStrategy", () => ({
  AmazonLaunchStrategy: function AmazonLaunchStrategy() {
    return { buildCommand: mocks.amazonBuildCommand, buildEnv: mocks.amazonBuildEnv };
  },
}));
vi.mock("@/services/launch/strategies/SteamLaunchStrategy", () => ({
  SteamLaunchStrategy: function SteamLaunchStrategy() {
    return { buildCommand: mocks.steamBuildCommand, buildEnv: mocks.steamBuildEnv };
  },
}));

import { LaunchCommandBuilder } from "@/services/launch/LaunchCommandBuilder";

describe("LaunchCommandBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LaunchCommandBuilder as any).instance = null;

    // Defaults ProtonService pour la voie fallback
    mocks.ensureProtonInstalled.mockResolvedValue(null);
    mocks.checkSystemPrerequisites.mockResolvedValue({ ok: true, missing: [], instructions: "" });
    mocks.getPrefixesDir.mockResolvedValue("/pixxiden/prefixes");
    mocks.getRunnersDir.mockResolvedValue("/pixxiden/runners");
  });

  afterEach(() => {
    (LaunchCommandBuilder as any).instance = null;
  });

  // -----------------------------------------------------------------
  describe("path umu-run (non-steam + umuId + executablePath)", () => {
    it("utilise buildDirectLaunch et retourne commande umu-run", async () => {
      const game = createGame({
        id: "gog-1456460669",
        store: "gog",
        storeId: "1456460669",
        title: "Baldur's Gate 3",
        executablePath: "/Games/bg3/bin/bg3.exe",
        winePrefix: "/Games/Prefixes/bg3",
        umuId: "umu-1086940",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.buildDirectLaunch.mockReturnValue([
        ["umu-run", "/Games/bg3/bin/bg3.exe"],
        { GAMEID: "umu-1086940", STORE: "gog", WINEPREFIX: "/Games/Prefixes/bg3" },
      ]);

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("gog-1456460669");

      expect(mocks.buildDirectLaunch).toHaveBeenCalledWith({
        winePrefix: "/Games/Prefixes/bg3",
        store: "gog",
        umuId: "umu-1086940",
        executablePath: "/Games/bg3/bin/bg3.exe",
      });
      expect(result.launchCommand).toEqual(["umu-run", "/Games/bg3/bin/bg3.exe"]);
    });

    it("inclut les variables d'env depuis buildDirectLaunch", async () => {
      const game = createGame({
        id: "gog-game",
        store: "gog",
        storeId: "123",
        title: "",
        umuId: "umu-abc",
        executablePath: "/games/game.exe",
        winePrefix: "/prefix",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.buildDirectLaunch.mockReturnValue([
        ["umu-run", "/games/game.exe"],
        { GAMEID: "umu-abc", STORE: "gog", WINEPREFIX: "/prefix" },
      ]);

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("gog-game");

      expect(result.env).toMatchObject({
        GAMEID: "umu-abc",
        STORE: "gog",
        WINEPREFIX: "/prefix",
      });
    });

    it("n'appelle PAS les stratégies par store quand umu est disponible", async () => {
      const game = createGame({
        id: "epic-game",
        store: "epic",
        storeId: "MyEpicGame",
        title: "",
        umuId: "umu-epic-123",
        executablePath: "/epic/game.exe",
        winePrefix: "/prefix",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.buildDirectLaunch.mockReturnValue([
        ["umu-run", "/epic/game.exe"],
        { GAMEID: "umu-epic-123", STORE: "egs", WINEPREFIX: "/prefix" },
      ]);

      const builder = LaunchCommandBuilder.getInstance();
      await builder.prepareLaunch("epic-game");

      expect(mocks.epicBuildCommand).not.toHaveBeenCalled();
    });

    it("retourne le game depuis le repository", async () => {
      const game = createGame({
        id: "gog-1",
        store: "gog",
        storeId: "1",
        title: "",
        umuId: "umu-1",
        executablePath: "/game.exe",
        winePrefix: "/prefix",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.buildDirectLaunch.mockReturnValue([
        ["umu-run", "/game.exe"],
        { GAMEID: "umu-1", STORE: "gog", WINEPREFIX: "/prefix" },
      ]);

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("gog-1");

      expect(result.game).toBe(game);
    });
  });

  // -----------------------------------------------------------------
  describe("fallback stratégie — umuId absent", () => {
    it("délègue à GogLaunchStrategy quand umuId est absent", async () => {
      const game = createGame({
        id: "gog-no-umu",
        store: "gog",
        storeId: "999",
        title: "",
        executablePath: "/game.exe",
        // umuId absent → forcera le fallback
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.gogBuildCommand.mockResolvedValue(["gogdl", "launch", "999"]);
      mocks.gogBuildEnv.mockResolvedValue({});

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("gog-no-umu");

      expect(mocks.gogBuildCommand).toHaveBeenCalled();
      expect(result.launchCommand).toEqual(["gogdl", "launch", "999"]);
    });

    it("ne doit pas appeler buildDirectLaunch quand umuId est absent", async () => {
      const game = createGame({
        id: "epic-no-umu",
        store: "epic",
        storeId: "AppName",
        title: "",
        executablePath: "/game.exe",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.epicBuildCommand.mockResolvedValue(["legendary", "launch", "AppName"]);
      mocks.epicBuildEnv.mockResolvedValue({});

      const builder = LaunchCommandBuilder.getInstance();
      await builder.prepareLaunch("epic-no-umu");

      expect(mocks.buildDirectLaunch).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------
  describe("fallback stratégie — executablePath absent", () => {
    it("délègue à GogLaunchStrategy quand executablePath est absent", async () => {
      const game = createGame({
        id: "gog-no-exe",
        store: "gog",
        storeId: "777",
        title: "",
        umuId: "umu-777",
        // executablePath absent → forcera le fallback
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.gogBuildCommand.mockResolvedValue(["gogdl", "launch", "777"]);
      mocks.gogBuildEnv.mockResolvedValue({});

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("gog-no-exe");

      expect(mocks.gogBuildCommand).toHaveBeenCalled();
      expect(mocks.buildDirectLaunch).not.toHaveBeenCalled();
      expect(result.launchCommand).toEqual(["gogdl", "launch", "777"]);
    });
  });

  // -----------------------------------------------------------------
  describe("jeux Steam", () => {
    it("délègue toujours à SteamLaunchStrategy", async () => {
      const game = createGame({
        id: "steam-730",
        store: "steam",
        storeId: "730",
        title: "Counter-Strike 2",
      });
      mocks.getGameById.mockResolvedValue(game);
      mocks.steamBuildCommand.mockResolvedValue(["steam", "-applaunch", "730"]);
      mocks.steamBuildEnv.mockResolvedValue({});

      const builder = LaunchCommandBuilder.getInstance();
      const result = await builder.prepareLaunch("steam-730");

      expect(mocks.steamBuildCommand).toHaveBeenCalled();
      expect(mocks.buildDirectLaunch).not.toHaveBeenCalled();
      expect(result.launchCommand).toEqual(["steam", "-applaunch", "730"]);
    });
  });

  // -----------------------------------------------------------------
  describe("erreurs", () => {
    it("lance une erreur si le jeu n'est pas trouvé", async () => {
      mocks.getGameById.mockResolvedValue(null);

      const builder = LaunchCommandBuilder.getInstance();
      await expect(builder.prepareLaunch("nonexistent-id")).rejects.toThrow("Game not found");
    });
  });
});


