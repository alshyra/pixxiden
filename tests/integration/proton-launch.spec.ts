/**
 * Integration test: Proton Launch Command Building
 *
 * Validates that GameLibraryOrchestrator builds correct CLI commands
 * for launching games through Proton-GE. Key insight:
 * Proton is NOT a Wine drop-in — it requires a verb (waitforexitandrun)
 * as the first argument. Using --wine would call `proton game.exe` which
 * errors with "Proton: Need a verb."
 *
 * Correct: --no-wine --wrapper "'protonPath' waitforexitandrun"
 * Wrong:   --wine protonPath
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameLibraryOrchestrator } from "@/services/GameLibraryOrchestrator";
import { createGame } from "@/types";
import type { ProtonConfig } from "@/services/runners";

// ===== Mock setup =====

// Mock DatabaseService
vi.mock("@/services/base/DatabaseService", () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      init: vi.fn(),
      queryOne: vi.fn(),
      execute: vi.fn(),
      select: vi.fn(),
    })),
  },
}));

// Mock SidecarService
vi.mock("@/services/base/SidecarService", () => ({
  SidecarService: {
    getInstance: vi.fn(() => ({
      runCommand: vi.fn(),
      spawnStreaming: vi.fn(),
    })),
  },
}));

// Mock GameRepository
vi.mock("@/lib/database", () => ({
  GameRepository: {
    getInstance: vi.fn(() => ({
      getGameById: vi.fn(),
      getAllGames: vi.fn(),
    })),
  },
}));

// Mock GameSyncService
vi.mock("@/lib/sync", () => ({
  GameSyncService: {
    getInstance: vi.fn(() => ({
      sync: vi.fn(),
    })),
  },
}));

// Mock store services — must be class-like (called with `new` in Orchestrator constructor)
vi.mock("@/services/stores", () => {
  class MockLegendaryService {
    isAuthenticated = vi.fn();
    getCapabilities = vi.fn(() => ({}));
  }
  class MockGogdlService {
    isAuthenticated = vi.fn();
    getCapabilities = vi.fn(() => ({}));
    getAuthConfigPathPublic = vi.fn(async () => "/home/user/.config/heroic/gog_store/auth.json");
  }
  class MockNileService {
    isAuthenticated = vi.fn();
    getCapabilities = vi.fn(() => ({}));
  }
  return {
    LegendaryService: MockLegendaryService,
    GogdlService: MockGogdlService,
    NileService: MockNileService,
  };
});

// Track ProtonService mock state
const mockProtonConfig: ProtonConfig = {
  version: "GE-Proton10-29",
  protonPath: "/home/user/.local/share/pixxiden/runners/GE-Proton10-29/proton",
  installedAt: new Date().toISOString(),
};

vi.mock("@/services/runners", () => ({
  ProtonService: {
    getInstance: vi.fn(() => ({
      ensureProtonInstalled: vi.fn(async () => mockProtonConfig),
      checkSystemPrerequisites: vi.fn(async () => ({ ok: true, missing: [], instructions: "" })),
      getPrefixesDir: vi.fn(async () => "/home/user/.local/share/pixxiden/prefixes"),
      getRunnersDir: vi.fn(async () => "/home/user/.local/share/pixxiden/runners"),
    })),
  },
}));

// Mock tauri log
vi.mock("@tauri-apps/plugin-log", () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

// Mock tauri fs (mkdir used to create prefix directories)
vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn(async () => undefined),
  exists: vi.fn(async () => false),
  readDir: vi.fn(async () => []),
  remove: vi.fn(async () => undefined),
}));

describe("Proton Launch Integration", () => {
  let orchestrator: GameLibraryOrchestrator;

  beforeEach(() => {
    // Reset singleton
    (GameLibraryOrchestrator as unknown as { instance: null }).instance = null;
    orchestrator = GameLibraryOrchestrator.getInstance();
  });

  // Helper to access private method via prototype
  async function buildLaunchCommand(
    orchestrator: GameLibraryOrchestrator,
    game: ReturnType<typeof createGame>,
    protonConfig: ProtonConfig | null,
  ): Promise<string[]> {
    // Access private method for testing
    return (orchestrator as unknown as { buildLaunchCommand: typeof buildLaunchCommand })[
      "buildLaunchCommand"
    ](game, protonConfig);
  }

  async function buildLaunchEnv(
    orchestrator: GameLibraryOrchestrator,
    game: ReturnType<typeof createGame>,
    protonConfig: ProtonConfig | null,
  ): Promise<Record<string, string>> {
    return (orchestrator as unknown as { buildLaunchEnv: typeof buildLaunchEnv })["buildLaunchEnv"](
      game,
      protonConfig,
    );
  }

  describe("Epic Games (legendary) with Proton", () => {
    const epicGame = createGame({
      id: "epic-b22ce34b",
      store: "epic",
      storeId: "b22ce34b4ce0408c97a888554447479b",
      title: "BioShock 2 Remastered",
      installed: true,
      installPath: "/home/user/.config/legendary/BioShock2HD",
    });

    it("should use --no-wine --wrapper instead of --wine for Proton", async () => {
      const cmd = await buildLaunchCommand(orchestrator, epicGame, mockProtonConfig);

      // Must NOT contain --wine (Proton is not a Wine drop-in)
      expect(cmd).not.toContain("--wine");

      // Must contain --no-wine to disable legendary's wine handling
      expect(cmd).toContain("--no-wine");

      // Must contain --wrapper with proton path + verb
      expect(cmd).toContain("--wrapper");
    });

    it("should include waitforexitandrun verb in wrapper", async () => {
      const cmd = await buildLaunchCommand(orchestrator, epicGame, mockProtonConfig);

      const wrapperIdx = cmd.indexOf("--wrapper");
      const wrapperValue = cmd[wrapperIdx + 1];

      // Wrapper must include the verb
      expect(wrapperValue).toContain("waitforexitandrun");
      // Wrapper must include proton path
      expect(wrapperValue).toContain(mockProtonConfig.protonPath);
    });

    it("should build correct full command array", async () => {
      const cmd = await buildLaunchCommand(orchestrator, epicGame, mockProtonConfig);

      expect(cmd).toEqual([
        "legendary",
        "launch",
        "b22ce34b4ce0408c97a888554447479b",
        "--no-wine",
        "--wrapper",
        `'${mockProtonConfig.protonPath}' waitforexitandrun`,
      ]);
    });

    it("should NOT use --wine-prefix (handled by env vars)", async () => {
      const cmd = await buildLaunchCommand(orchestrator, epicGame, mockProtonConfig);
      expect(cmd).not.toContain("--wine-prefix");
    });

    it("should skip Proton flags when no protonConfig", async () => {
      const cmd = await buildLaunchCommand(orchestrator, epicGame, null);

      expect(cmd).toEqual(["legendary", "launch", "b22ce34b4ce0408c97a888554447479b"]);

      expect(cmd).not.toContain("--no-wine");
      expect(cmd).not.toContain("--wrapper");
    });

    it("should set STEAM_COMPAT_DATA_PATH env var", async () => {
      const env = await buildLaunchEnv(orchestrator, epicGame, mockProtonConfig);

      expect(env.STEAM_COMPAT_DATA_PATH).toBe(
        "/home/user/.local/share/pixxiden/prefixes/epic/b22ce34b4ce0408c97a888554447479b",
      );
    });

    it("should set STEAM_COMPAT_CLIENT_INSTALL_PATH env var", async () => {
      const env = await buildLaunchEnv(orchestrator, epicGame, mockProtonConfig);

      expect(env.STEAM_COMPAT_CLIENT_INSTALL_PATH).toBe(
        "/home/user/.local/share/pixxiden/runners/compat",
      );
    });

    it("should return empty env when no protonConfig", async () => {
      const env = await buildLaunchEnv(orchestrator, epicGame, null);
      expect(env).toEqual({});
    });
  });

  describe("GOG (gogdl) with Proton", () => {
    const gogGame = createGame({
      id: "gog-1234567890",
      store: "gog",
      storeId: "1234567890",
      title: "The Witcher 3",
      installed: true,
      installPath: "/home/user/Games/GOG/The Witcher 3",
    });

    it("should use --no-wine --wrapper instead of --wine for Proton", async () => {
      const cmd = await buildLaunchCommand(orchestrator, gogGame, mockProtonConfig);

      expect(cmd).not.toContain("--wine");
      expect(cmd).toContain("--no-wine");
      expect(cmd).toContain("--wrapper");
    });

    it("should include --platform windows when using Proton", async () => {
      const cmd = await buildLaunchCommand(orchestrator, gogGame, mockProtonConfig);
      expect(cmd).toContain("--platform");
      expect(cmd).toContain("windows");
    });

    it("should build correct full command array", async () => {
      const cmd = await buildLaunchCommand(orchestrator, gogGame, mockProtonConfig);

      expect(cmd).toEqual([
        "gogdl",
        "--auth-config-path",
        "/home/user/.config/heroic/gog_store/auth.json",
        "launch",
        "--platform",
        "windows",
        "--no-wine",
        "--wrapper",
        `'${mockProtonConfig.protonPath}' waitforexitandrun`,
        "/home/user/Games/GOG/The Witcher 3",
        "1234567890",
      ]);
    });

    it("should NOT use --wine-prefix (handled by env vars)", async () => {
      const cmd = await buildLaunchCommand(orchestrator, gogGame, mockProtonConfig);
      expect(cmd).not.toContain("--wine-prefix");
    });

    it("should set STEAM_COMPAT_DATA_PATH for GOG store", async () => {
      const env = await buildLaunchEnv(orchestrator, gogGame, mockProtonConfig);

      expect(env.STEAM_COMPAT_DATA_PATH).toBe(
        "/home/user/.local/share/pixxiden/prefixes/gog/1234567890",
      );
    });

    it("should skip Proton flags when no protonConfig", async () => {
      const cmd = await buildLaunchCommand(orchestrator, gogGame, null);

      // Should not have --platform, --no-wine, or --wrapper
      expect(cmd).not.toContain("--platform");
      expect(cmd).not.toContain("--no-wine");
      expect(cmd).not.toContain("--wrapper");
    });
  });

  describe("Amazon (nile) — no Proton needed", () => {
    const amazonGame = createGame({
      id: "amazon-abc123",
      store: "amazon",
      storeId: "abc123",
      title: "Amazon Game",
    });

    it("should build simple nile launch command", async () => {
      const cmd = await buildLaunchCommand(orchestrator, amazonGame, mockProtonConfig);
      expect(cmd).toEqual(["nile", "launch", "abc123"]);
    });

    it("should not set Proton env vars for amazon", async () => {
      const env = await buildLaunchEnv(orchestrator, amazonGame, mockProtonConfig);
      expect(env).toEqual({});
    });
  });

  describe("Steam — native protocol", () => {
    const steamGame = createGame({
      id: "steam-730",
      store: "steam",
      storeId: "730",
      title: "Counter-Strike 2",
    });

    it("should build steam protocol command", async () => {
      const cmd = await buildLaunchCommand(orchestrator, steamGame, mockProtonConfig);
      expect(cmd).toEqual(["steam", "-applaunch", "730"]);
    });

    it("should not set Proton env vars for steam", async () => {
      const env = await buildLaunchEnv(orchestrator, steamGame, mockProtonConfig);
      expect(env).toEqual({});
    });
  });
});
