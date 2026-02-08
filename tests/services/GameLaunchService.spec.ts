/**
 * Tests for GameLaunchService
 *
 * GameLaunchService executes game launch commands via sidecar streaming,
 * replacing the missing Rust launch_game_v2 command.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StreamingHandle } from "@/services/base/SidecarService";

// Mock @tauri-apps/plugin-shell
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn().mockResolvedValue(undefined),
}));

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}));

// Mock SidecarService
const mockSpawnStreaming = vi.fn();
vi.mock("@/services/base/SidecarService", () => ({
  SidecarService: {
    getInstance: () => ({
      spawnStreaming: mockSpawnStreaming,
    }),
  },
}));

import { GameLaunchService } from "@/services/launch/GameLaunchService";
import { open } from "@tauri-apps/plugin-shell";
import { createGame } from "@/types";

function createMockStreamingHandle(
  code: number = 0,
  resolveImmediately: boolean = true,
): { handle: StreamingHandle; resolve: (code: number) => void } {
  let resolveCompletion: (value: { code: number }) => void;

  const completion = new Promise<{ code: number }>((resolve) => {
    resolveCompletion = resolve;
  });

  if (resolveImmediately) {
    // Resolve after a micro-tick to allow the service to set up tracking
    Promise.resolve().then(() => resolveCompletion({ code }));
  }

  const handle: StreamingHandle = {
    child: { pid: 42, kill: vi.fn().mockResolvedValue(undefined), write: vi.fn() } as any,
    completion,
    kill: vi.fn().mockResolvedValue(undefined),
  };

  return { handle, resolve: (c) => resolveCompletion({ code: c }) };
}

describe("GameLaunchService", () => {
  let launchService: GameLaunchService;

  beforeEach(() => {
    vi.clearAllMocks();
    (GameLaunchService as any).instance = null;
    launchService = GameLaunchService.getInstance();
  });

  afterEach(() => {
    (GameLaunchService as any).instance = null;
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const a = GameLaunchService.getInstance();
      const b = GameLaunchService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("launchFromCommand", () => {
    it("should spawn sidecar with parsed command", async () => {
      const { handle } = createMockStreamingHandle(0);
      mockSpawnStreaming.mockResolvedValue(handle);

      const game = createGame({
        id: "epic-TestGame",
        store: "epic",
        storeId: "TestGame",
        title: "Test Game",
      });

      await launchService.launchFromCommand(game, [
        "legendary",
        "launch",
        "TestGame",
        "--wine",
        "/path/to/proton",
      ]);

      expect(mockSpawnStreaming).toHaveBeenCalledWith(
        "legendary",
        ["launch", "TestGame", "--wine", "/path/to/proton"],
        expect.objectContaining({
          onStdout: expect.any(Function),
          onStderr: expect.any(Function),
        }),
      );
    });

    it("should track game as running", async () => {
      const { handle } = createMockStreamingHandle(0, false);
      mockSpawnStreaming.mockResolvedValue(handle);

      const game = createGame({
        id: "epic-RunningGame",
        store: "epic",
        storeId: "RunningGame",
        title: "Running Game",
      });

      await launchService.launchFromCommand(game, ["legendary", "launch", "RunningGame"]);

      expect(launchService.isRunning("epic-RunningGame")).toBe(true);
      expect(launchService.getRunningGames()).toContain("epic-RunningGame");
    });

    it("should call onExit when game exits", async () => {
      const { handle, resolve } = createMockStreamingHandle(0, false);
      mockSpawnStreaming.mockResolvedValue(handle);

      const onExit = vi.fn();
      const game = createGame({
        id: "epic-ExitGame",
        store: "epic",
        storeId: "ExitGame",
        title: "Exit Game",
      });

      await launchService.launchFromCommand(
        game,
        ["legendary", "launch", "ExitGame"],
        {},
        { onExit },
      );

      // Game exits
      resolve(0);
      await new Promise((r) => setTimeout(r, 10));

      expect(onExit).toHaveBeenCalledWith(0);
      expect(launchService.isRunning("epic-ExitGame")).toBe(false);
    });

    it("should not launch same game twice", async () => {
      const { handle } = createMockStreamingHandle(0, false);
      mockSpawnStreaming.mockResolvedValue(handle);

      const game = createGame({
        id: "epic-DupeGame",
        store: "epic",
        storeId: "DupeGame",
        title: "Dupe Game",
      });

      await launchService.launchFromCommand(game, ["legendary", "launch", "DupeGame"]);
      await launchService.launchFromCommand(game, ["legendary", "launch", "DupeGame"]);

      // Should only spawn once
      expect(mockSpawnStreaming).toHaveBeenCalledTimes(1);
    });

    it("should handle Steam games via protocol URL", async () => {
      const game = createGame({
        id: "steam-730",
        store: "steam",
        storeId: "730",
        title: "Counter-Strike 2",
      });

      await launchService.launchFromCommand(game, ["steam", "-applaunch", "730"]);

      expect(open).toHaveBeenCalledWith("steam://rungameid/730");
      expect(mockSpawnStreaming).not.toHaveBeenCalled();
    });
  });

  describe("forceClose", () => {
    it("should kill the game process", async () => {
      const { handle } = createMockStreamingHandle(0, false);
      mockSpawnStreaming.mockResolvedValue(handle);

      const game = createGame({
        id: "epic-KillMe",
        store: "epic",
        storeId: "KillMe",
        title: "Kill Me",
      });

      await launchService.launchFromCommand(game, ["legendary", "launch", "KillMe"]);
      expect(launchService.isRunning("epic-KillMe")).toBe(true);

      await launchService.forceClose("epic-KillMe");

      expect(handle.kill).toHaveBeenCalled();
      expect(launchService.isRunning("epic-KillMe")).toBe(false);
    });

    it("should handle force close when game not running", async () => {
      // Should not throw
      await launchService.forceClose("epic-NotRunning");
    });
  });

  describe("isRunning", () => {
    it("should return false for unknown game", () => {
      expect(launchService.isRunning("epic-Unknown")).toBe(false);
    });
  });

  describe("getRunningGames", () => {
    it("should return empty array initially", () => {
      expect(launchService.getRunningGames()).toEqual([]);
    });
  });
});
