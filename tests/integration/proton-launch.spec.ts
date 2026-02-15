/**
 * Integration test: Proton Launch Command Building
 *
 * Validates that launch strategies build correct CLI commands
 * for launching games through Proton-GE. Key insight:
 * Proton is NOT a Wine drop-in — it requires a verb (waitforexitandrun)
 * as the first argument. Using --wine would call `proton game.exe` which
 * errors with "Proton: Need a verb."
 *
 * Correct: --no-wine --wrapper "'protonPath' waitforexitandrun"
 * Wrong:   --wine protonPath
 */

import { describe, it, expect, vi } from "vitest";
import { createGame } from "@/types";
import type { LaunchContext } from "@/services/launch/strategies/LaunchStrategy";
import { EpicLaunchStrategy } from "@/services/launch/strategies/EpicLaunchStrategy";
import { GogLaunchStrategy } from "@/services/launch/strategies/GogLaunchStrategy";
import { AmazonLaunchStrategy } from "@/services/launch/strategies/AmazonLaunchStrategy";
import { SteamLaunchStrategy } from "@/services/launch/strategies/SteamLaunchStrategy";

// Mock the stores barrel (GogLaunchStrategy imports GogdlService from here)
vi.mock("@/services/stores", () => ({
  GogdlService: {
    getInstance: vi.fn(() => ({
      getAuthConfigPathPublic: vi.fn(async () => "/home/user/.config/heroic/gog_store/auth.json"),
    })),
  },
  LegendaryService: { getInstance: vi.fn(() => ({})) },
  NileService: { getInstance: vi.fn(() => ({})) },
  SteamService: { getInstance: vi.fn(() => ({})) },
  GameStoreService: class {},
}));

// Mock tauri log
vi.mock("@tauri-apps/plugin-log", () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ===== Test Constants =====

const PROTON_PATH = "/home/user/.local/share/pixxiden/runners/GE-Proton10-29/proton";
const CLEAN_ENV_PREFIX =
  "/usr/bin/env -u PYTHONHOME -u PYTHONPATH -u PYTHONDONTWRITEBYTECODE -u _MEIPASS2 -u LD_LIBRARY_PATH";
const COMPAT_DATA_PATH =
  "/home/user/.local/share/pixxiden/prefixes/epic/b22ce34b4ce0408c97a888554447479b";
const COMPAT_CLIENT_INSTALL_PATH = "/home/user/.local/share/pixxiden/runners/compat";

/** Build a LaunchContext with Proton enabled */
function protonContext(overrides: Partial<LaunchContext> = {}): LaunchContext {
  return {
    protonPath: PROTON_PATH,
    cleanEnvPrefix: CLEAN_ENV_PREFIX,
    compatDataPath: COMPAT_DATA_PATH,
    compatClientInstallPath: COMPAT_CLIENT_INSTALL_PATH,
    ...overrides,
  };
}

/** Build a LaunchContext with Proton disabled */
function noProtonContext(): LaunchContext {
  return {
    protonPath: null,
    cleanEnvPrefix: CLEAN_ENV_PREFIX,
    compatDataPath: "",
    compatClientInstallPath: "",
  };
}

// ===== Tests =====

describe("Proton Launch Integration", () => {
  describe("Epic Games (legendary) with Proton", () => {
    const strategy = new EpicLaunchStrategy();
    const epicGame = createGame({
      id: "epic-b22ce34b",
      store: "epic",
      storeId: "b22ce34b4ce0408c97a888554447479b",
      title: "BioShock 2 Remastered",
      installed: true,
      installPath: "/home/user/.config/legendary/BioShock2HD",
    });

    it("should use --no-wine --wrapper instead of --wine for Proton", async () => {
      const cmd = await strategy.buildCommand(epicGame, protonContext());

      expect(cmd).not.toContain("--wine");
      expect(cmd).toContain("--no-wine");
      expect(cmd).toContain("--wrapper");
    });

    it("should include waitforexitandrun verb in wrapper", async () => {
      const cmd = await strategy.buildCommand(epicGame, protonContext());

      const wrapperIdx = cmd.indexOf("--wrapper");
      const wrapperValue = cmd[wrapperIdx + 1];

      expect(wrapperValue).toContain("waitforexitandrun");
      expect(wrapperValue).toContain(PROTON_PATH);
    });

    it("should build correct full command array", async () => {
      const cmd = await strategy.buildCommand(epicGame, protonContext());

      expect(cmd).toEqual([
        "legendary",
        "launch",
        "b22ce34b4ce0408c97a888554447479b",
        "--no-wine",
        "--wrapper",
        `${CLEAN_ENV_PREFIX} ${PROTON_PATH} waitforexitandrun`,
      ]);
    });

    it("should NOT use --wine-prefix (handled by env vars)", async () => {
      const cmd = await strategy.buildCommand(epicGame, protonContext());
      expect(cmd).not.toContain("--wine-prefix");
    });

    it("should skip Proton flags when no protonPath", async () => {
      const cmd = await strategy.buildCommand(epicGame, noProtonContext());

      expect(cmd).toEqual(["legendary", "launch", "b22ce34b4ce0408c97a888554447479b"]);
      expect(cmd).not.toContain("--no-wine");
      expect(cmd).not.toContain("--wrapper");
    });

    it("should set STEAM_COMPAT_DATA_PATH env var", async () => {
      const env = await strategy.buildEnv(epicGame, protonContext());

      expect(env.STEAM_COMPAT_DATA_PATH).toBe(COMPAT_DATA_PATH);
    });

    it("should set STEAM_COMPAT_CLIENT_INSTALL_PATH env var", async () => {
      const env = await strategy.buildEnv(epicGame, protonContext());

      expect(env.STEAM_COMPAT_CLIENT_INSTALL_PATH).toBe(COMPAT_CLIENT_INSTALL_PATH);
    });

    it("should return empty env when no protonPath", async () => {
      const env = await strategy.buildEnv(epicGame, noProtonContext());
      expect(env).toEqual({});
    });
  });

  describe("GOG (gogdl) with Proton", () => {
    const strategy = new GogLaunchStrategy();
    const gogGame = createGame({
      id: "gog-1234567890",
      store: "gog",
      storeId: "1234567890",
      title: "The Witcher 3",
      installed: true,
      installPath: "/home/user/Games/GOG/The Witcher 3",
    });

    const gogContext = protonContext({
      compatDataPath: "/home/user/.local/share/pixxiden/prefixes/gog/1234567890",
    });

    it("should use --no-wine --wrapper instead of --wine for Proton", async () => {
      const cmd = await strategy.buildCommand(gogGame, gogContext);

      expect(cmd).not.toContain("--wine");
      expect(cmd).toContain("--no-wine");
      expect(cmd).toContain("--wrapper");
    });

    it("should include --platform windows when using Proton", async () => {
      const cmd = await strategy.buildCommand(gogGame, gogContext);

      expect(cmd).toContain("--platform");
      expect(cmd).toContain("windows");
    });

    it("should build correct full command array", async () => {
      const cmd = await strategy.buildCommand(gogGame, gogContext);

      expect(cmd).toEqual([
        "gogdl",
        "--auth-config-path",
        "/home/user/.config/heroic/gog_store/auth.json",
        "launch",
        "--platform",
        "windows",
        "--no-wine",
        "--wrapper",
        `${CLEAN_ENV_PREFIX} ${PROTON_PATH} waitforexitandrun`,
        "/home/user/Games/GOG/The Witcher 3",
        "1234567890",
      ]);
    });

    it("should NOT use --wine-prefix (handled by env vars)", async () => {
      const cmd = await strategy.buildCommand(gogGame, gogContext);
      expect(cmd).not.toContain("--wine-prefix");
    });

    it("should set STEAM_COMPAT_DATA_PATH for GOG store", async () => {
      const env = await strategy.buildEnv(gogGame, gogContext);

      expect(env.STEAM_COMPAT_DATA_PATH).toBe(
        "/home/user/.local/share/pixxiden/prefixes/gog/1234567890",
      );
    });

    it("should skip Proton flags when no protonPath", async () => {
      const cmd = await strategy.buildCommand(gogGame, noProtonContext());

      expect(cmd).not.toContain("--platform");
      expect(cmd).not.toContain("--no-wine");
      expect(cmd).not.toContain("--wrapper");
    });
  });

  describe("Amazon (nile) — no Proton needed", () => {
    const strategy = new AmazonLaunchStrategy();
    const amazonGame = createGame({
      id: "amazon-abc123",
      store: "amazon",
      storeId: "abc123",
      title: "Amazon Game",
    });

    it("should build simple nile launch command", async () => {
      const cmd = await strategy.buildCommand(amazonGame, protonContext());
      expect(cmd).toEqual(["nile", "launch", "abc123"]);
    });

    it("should not set Proton env vars for amazon", async () => {
      const env = await strategy.buildEnv(amazonGame, protonContext());
      expect(env).toEqual({});
    });
  });

  describe("Steam — native protocol", () => {
    const strategy = new SteamLaunchStrategy();
    const steamGame = createGame({
      id: "steam-730",
      store: "steam",
      storeId: "730",
      title: "Counter-Strike 2",
    });

    it("should build steam protocol command", async () => {
      const cmd = await strategy.buildCommand(steamGame, protonContext());
      expect(cmd).toEqual(["steam", "-applaunch", "730"]);
    });

    it("should not set Proton env vars for steam", async () => {
      const env = await strategy.buildEnv(steamGame, protonContext());
      expect(env).toEqual({});
    });
  });
});
