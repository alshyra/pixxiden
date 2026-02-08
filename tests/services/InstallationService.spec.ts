/**
 * Tests for InstallationService
 *
 * LegendaryInstallation uses streaming spawn (spawnLegendaryStreaming) for real-time progress.
 * Other installers still use synchronous runXxx methods.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallationService } from "@/services/installation/InstallationService";
import { SidecarService } from "@/services/base/SidecarService";
import { DatabaseService } from "@/services/base/DatabaseService";
import type { StreamingHandle } from "@/services/base/SidecarService";

/**
 * Helper: creates a mock StreamingHandle that resolves immediately with given code.
 * Optionally calls onStderr/onStdout callbacks before resolving.
 */
function createMockStreamingHandle(
  code: number,
  callbacks?: { onStdout?: (line: string) => void; onStderr?: (line: string) => void },
  stderrLines?: string[],
): StreamingHandle {
  // Simulate output lines if provided
  if (stderrLines && callbacks?.onStderr) {
    for (const line of stderrLines) {
      callbacks.onStderr(line);
    }
  }

  return {
    child: { pid: 12345, kill: vi.fn().mockResolvedValue(undefined), write: vi.fn() } as any,
    completion: Promise.resolve({ code }),
    kill: vi.fn().mockResolvedValue(undefined),
  };
}

describe("InstallationService", () => {
  let installationService: InstallationService;
  let mockSidecar: SidecarService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    // Mock SidecarService with both synchronous and streaming methods
    mockSidecar = {
      runLegendary: vi.fn(),
      runGogdl: vi.fn(),
      runNile: vi.fn(),
      runCommand: vi.fn(),
      spawnLegendaryStreaming: vi.fn(),
    } as any;

    // Mock DatabaseService
    mockDb = {
      execute: vi.fn(),
      queryOne: vi.fn(),
      select: vi.fn(),
    } as any;

    installationService = new InstallationService(mockSidecar, mockDb);
  });

  describe("installGame", () => {
    it("should install an Epic game successfully", async () => {
      const gameId = "epic-test-game";
      const store = "epic";
      const installPath = "/games/epic";

      // LegendaryInstallation uses streaming spawn
      vi.spyOn(mockSidecar, "spawnLegendaryStreaming").mockImplementation(
        (args: string[], _callbacks?: any) => {
          return Promise.resolve(createMockStreamingHandle(0));
        },
      );

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.installGame(gameId, store, { installPath });

      // CLI receives the raw store ID (without the "epic-" prefix)
      // -y flag auto-confirms the installation prompt
      expect(mockSidecar.spawnLegendaryStreaming).toHaveBeenCalledWith(
        ["install", "test-game", "-y", "--base-path", installPath],
        expect.any(Object),
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE games SET installed = 1"),
        expect.any(Array),
      );
    });

    it("should install a GOG game with custom path", async () => {
      const gameId = "gog-test-game";
      const store = "gog";
      const installPath = "/custom/path";

      vi.spyOn(mockSidecar, "runGogdl").mockResolvedValue({
        code: 0,
        stdout: "Installation complete",
        stderr: "",
      });

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.installGame(gameId, store, { installPath });

      // CLI receives --auth-config-path before subcommand, --platform linux, and raw store ID
      expect(mockSidecar.runGogdl).toHaveBeenCalledWith([
        "--auth-config-path",
        expect.any(String),
        "download",
        "test-game",
        "--platform",
        "linux",
        "--path",
        installPath,
      ]);
    });

    it("should emit progress events during installation", async () => {
      const gameId = "epic-game";
      const store = "epic";
      const progressEvents: any[] = [];

      // Mock streaming spawn — simulate some stderr output with progress
      vi.spyOn(mockSidecar, "spawnLegendaryStreaming").mockImplementation(
        (_args: string[], callbacks?: any) => {
          // Simulate legendary output
          callbacks?.onStderr?.("[DLManager] INFO: = Progress: 50.00% (1.00/2.00 GiB), Running for 00:01:00, ETA: 00:01:00");
          return Promise.resolve(createMockStreamingHandle(0));
        },
      );

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.installGame(gameId, store, {
        onProgress: (progress) => progressEvents.push(progress),
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toMatchObject({
        gameId,
        status: "queued",
        progress: 0,
      });
      expect(progressEvents[progressEvents.length - 1]).toMatchObject({
        gameId,
        status: "completed",
        progress: 100,
      });
    });

    it("should handle installation failure", async () => {
      const gameId = "epic-game";
      const store = "epic";

      // Streaming spawn that exits with error code
      vi.spyOn(mockSidecar, "spawnLegendaryStreaming").mockImplementation(
        () => Promise.resolve(createMockStreamingHandle(1)),
      );

      await expect(installationService.installGame(gameId, store)).rejects.toThrow(
        "legendary install exited with code 1",
      );
    });
  });

  describe("uninstallGame", () => {
    it("should uninstall an Epic game successfully", async () => {
      const gameId = "epic-test-game";
      const store = "epic";

      vi.spyOn(mockSidecar, "runLegendary").mockResolvedValue({
        code: 0,
        stdout: "Uninstallation complete",
        stderr: "",
      });

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.uninstallGame(gameId, store);

      // CLI receives the raw store ID (without the "epic-" prefix)
      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["uninstall", "test-game", "--yes"]);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE games SET installed = 0"),
        [gameId],
      );
    });

    it("should emit progress events during uninstallation", async () => {
      const gameId = "gog-game";
      const store = "gog";
      const progressEvents: any[] = [];

      vi.spyOn(mockSidecar, "runGogdl").mockResolvedValue({
        code: 0,
        stdout: "Done",
        stderr: "",
      });

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.uninstallGame(gameId, store, {
        onProgress: (progress) => progressEvents.push(progress),
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1]).toMatchObject({
        gameId,
        status: "completed",
        progress: 100,
      });
    });
  });

  describe("cancelInstallation", () => {
    it("should track active installations", async () => {
      const gameId = "epic-game";
      const store = "epic";

      // Create a streaming handle that delays completion
      let resolveCompletion: ((value: { code: number }) => void) | null = null;

      vi.spyOn(mockSidecar, "spawnLegendaryStreaming").mockImplementation(
        () => {
          const completion = new Promise<{ code: number }>((resolve) => {
            resolveCompletion = resolve;
            // Also resolve after timeout as safety net
            setTimeout(() => resolve({ code: 0 }), 1000);
          });
          return Promise.resolve({
            child: { pid: 12345, kill: vi.fn().mockResolvedValue(undefined), write: vi.fn() } as any,
            completion,
            kill: vi.fn().mockResolvedValue(undefined),
          });
        },
      );

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      // Start installation (don't await)
      const installPromise = installationService.installGame(gameId, store);

      // Wait for spawn to happen
      await new Promise((r) => setTimeout(r, 10));

      // Check if it's tracked
      expect(installationService.isInstalling(gameId)).toBe(true);
      expect(installationService.getActiveInstallations()).toContain(gameId);

      // Resolve the completion
      resolveCompletion?.({ code: 0 });

      // Wait for installation to complete
      await installPromise.catch(() => {});

      expect(installationService.isInstalling(gameId)).toBe(false);
    });
  });
});
