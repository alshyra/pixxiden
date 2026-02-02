/**
 * Tests for InstallationService
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallationService } from "@/services/installation/InstallationService";
import { SidecarService } from "@/services/base/SidecarService";
import { DatabaseService } from "@/services/base/DatabaseService";

describe("InstallationService", () => {
  let installationService: InstallationService;
  let mockSidecar: SidecarService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    // Mock SidecarService
    mockSidecar = {
      runLegendary: vi.fn(),
      runGogdl: vi.fn(),
      runNile: vi.fn(),
      runCommand: vi.fn(),
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

      vi.spyOn(mockSidecar, "runLegendary").mockResolvedValue({
        code: 0,
        stdout: "Installation complete",
        stderr: "",
      });

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      await installationService.installGame(gameId, store);

      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(
        ["install", gameId],
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

      expect(mockSidecar.runGogdl).toHaveBeenCalledWith(
        ["install", gameId, "--path", installPath],
        expect.any(Object),
      );
    });

    it("should emit progress events during installation", async () => {
      const gameId = "epic-game";
      const store = "epic";
      const progressEvents: any[] = [];

      vi.spyOn(mockSidecar, "runLegendary").mockResolvedValue({
        code: 0,
        stdout: "Done",
        stderr: "",
      });

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

      vi.spyOn(mockSidecar, "runLegendary").mockResolvedValue({
        code: 1,
        stdout: "",
        stderr: "Installation failed",
      });

      await expect(installationService.installGame(gameId, store)).rejects.toThrow(
        "Failed to install Epic game",
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

      expect(mockSidecar.runLegendary).toHaveBeenCalledWith(["uninstall", gameId, "--yes"]);
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

      vi.spyOn(mockSidecar, "runLegendary").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  code: 0,
                  stdout: "Done",
                  stderr: "",
                }),
              1000,
            );
          }),
      );

      vi.spyOn(mockDb, "execute").mockResolvedValue();

      // Start installation (don't await)
      const installPromise = installationService.installGame(gameId, store);

      // Check if it's tracked
      expect(installationService.isInstalling(gameId)).toBe(true);
      expect(installationService.getActiveInstallations()).toContain(gameId);

      // Cancel it
      await installationService.cancelInstallation(gameId);

      expect(installationService.isInstalling(gameId)).toBe(false);

      // Wait for installation to complete (should be cancelled)
      await installPromise.catch(() => {});
    });
  });
});
