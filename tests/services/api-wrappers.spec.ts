import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockInvoke,
  mockInvokeError,
  mockInvokeValue,
  resetServiceTestUtils,
  makeSidecarResult,
} from "../helpers/service-test-utils";

const mockQueryOne = vi.fn();
const mockRunLegendary = vi.fn();
const mockRunNile = vi.fn();

vi.mock("@/services/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@/services/base", () => ({
  getSidecar: () => ({
    runLegendary: (...args: unknown[]) => mockRunLegendary(...args),
    runNile: (...args: unknown[]) => mockRunNile(...args),
  }),
}));

vi.mock("@/services/base/DatabaseService", () => ({
  DatabaseService: {
    getInstance: () => ({
      queryOne: (...args: unknown[]) => mockQueryOne(...args),
    }),
  },
}));

import * as gamesApi from "@/services/api/games";
import * as systemApi from "@/services/api/system";
import * as updatesApi from "@/services/api/updates";
import * as storeApi from "@/services/api/store";

describe("API wrappers", () => {
  beforeEach(() => {
    resetServiceTestUtils();
    vi.clearAllMocks();
  });

  describe("games api", () => {
    it("returns games and game data", async () => {
      mockInvokeValue([{ id: "g1" }]);
      const games = await gamesApi.getGames();
      expect(games).toEqual([{ id: "g1" }]);
      expect(mockInvoke).toHaveBeenCalledWith("get_games");

      mockInvokeValue({ id: "g1" });
      const game = await gamesApi.getGame("g1");
      expect(game).toEqual({ id: "g1" });
      expect(mockInvoke).toHaveBeenCalledWith("get_game", { id: "g1" });
    });

    it("calls cache/sync and launch commands", async () => {
      mockInvokeValue(undefined);
      await gamesApi.clearGameCache("g1");
      expect(mockInvoke).toHaveBeenCalledWith("clear_game_cache", { gameId: "g1" });

      mockInvokeValue(undefined);
      await gamesApi.clearAllCache();
      expect(mockInvoke).toHaveBeenCalledWith("clear_all_cache");

      mockInvokeValue({ total_synced: 1, errors: [] });
      const sync = await gamesApi.syncGames();
      expect(sync.total_synced).toBe(1);

      mockInvokeValue(undefined);
      await gamesApi.launchGame("g1");
      expect(mockInvoke).toHaveBeenCalledWith("launch_game", { id: "g1" });
    });

    it("throws for deprecated install/uninstall", async () => {
      await expect(gamesApi.installGame("g1")).rejects.toThrow("InstallationService.installGame");
      await expect(gamesApi.uninstallGame("g1")).rejects.toThrow(
        "InstallationService.uninstallGame",
      );
    });

    it("rethrows invoke failures", async () => {
      mockInvokeError("boom");
      await expect(gamesApi.getCacheStats()).rejects.toThrow("boom");

      mockInvokeError("nope");
      await expect(gamesApi.scanGogInstalled()).rejects.toThrow("nope");

      mockInvokeError("cfg error");
      await expect(gamesApi.getGameConfig("g1")).rejects.toThrow("cfg error");

      mockInvokeError("update error");
      await expect(gamesApi.updateGameCustomExecutable("g1", null)).rejects.toThrow("update error");
    });
  });

  describe("system api", () => {
    it("returns system data", async () => {
      mockInvokeValue({ osName: "Linux" });
      expect((await systemApi.getSystemInfo()).osName).toBe("Linux");

      mockInvokeValue([{ name: "/dev/sda1" }]);
      expect((await systemApi.getDiskInfo()).length).toBe(1);

      mockInvokeValue(true);
      expect(await systemApi.checkForUpdates()).toBe(true);

      mockInvokeValue({ protonVersion: "GE-Proton9-20" });
      expect((await systemApi.getSettings()).protonVersion).toBe("GE-Proton9-20");
    });

    it("sends write commands", async () => {
      mockInvokeValue(undefined);
      await systemApi.shutdownSystem();
      expect(mockInvoke).toHaveBeenCalledWith("shutdown_system");

      mockInvokeValue(undefined);
      await systemApi.saveSettings({
        protonVersion: "GE-Proton9-20",
        mangoHudEnabled: true,
        defaultInstallPath: "/games",
        winePrefixPath: "/prefix",
      });
      expect(mockInvoke).toHaveBeenCalledWith("save_settings", {
        config: expect.objectContaining({ protonVersion: "GE-Proton9-20" }),
      });
    });

    it("rethrows system errors", async () => {
      mockInvokeError("sys err");
      await expect(systemApi.getSystemInfo()).rejects.toThrow("sys err");
    });
  });

  describe("updates api", () => {
    it("reads and writes update commands", async () => {
      mockInvokeValue("debian");
      expect(await updatesApi.getDistro()).toBe("debian");

      mockInvokeValue({ configured: true, distro: "debian", sudoersFileExists: true });
      expect((await updatesApi.isSudoersConfigured()).configured).toBe(true);

      mockInvokeValue(undefined);
      await updatesApi.configureSudoers("pwd");
      expect(mockInvoke).toHaveBeenCalledWith("configure_sudoers", { password: "pwd" });

      mockInvokeValue({ distro: "debian", packages: [], totalSize: 0, requiresReboot: false });
      expect((await updatesApi.checkSystemUpdates()).requiresReboot).toBe(false);

      mockInvokeValue({
        totalPackages: 0,
        installedSuccessfully: 0,
        failed: [],
        requiresReboot: false,
        durationSeconds: 1,
      });
      expect((await updatesApi.installSystemUpdates()).durationSeconds).toBe(1);

      mockInvokeValue(false);
      expect(await updatesApi.requiresSystemReboot()).toBe(false);

      mockInvokeValue(undefined);
      await updatesApi.rebootSystem();
      expect(mockInvoke).toHaveBeenCalledWith("reboot_system");
    });

    it("rethrows update errors", async () => {
      mockInvokeError("update err");
      await expect(updatesApi.getDistro()).rejects.toThrow("update err");
    });
  });

  describe("store api", () => {
    it("returns all store statuses in success path", async () => {
      mockRunLegendary.mockResolvedValueOnce(
        makeSidecarResult({
          code: 0,
          stdout: JSON.stringify({ account: "alice" }),
        }),
      );
      mockQueryOne.mockResolvedValueOnce({ access_token: "token" });
      mockRunNile.mockResolvedValueOnce(makeSidecarResult({ code: 0, stderr: "" }));

      const statuses = await storeApi.getStoreStatus();

      expect(statuses.find((s) => s.id === "epic")?.authenticated).toBe(true);
      expect(statuses.find((s) => s.id === "gog")?.authenticated).toBe(true);
      expect(statuses.find((s) => s.id === "amazon")?.authenticated).toBe(true);
      expect(statuses.find((s) => s.id === "steam")?.available).toBe(true);
    });

    it("falls back to unavailable when sidecars fail", async () => {
      mockRunLegendary.mockRejectedValueOnce(new Error("legendary down"));
      mockQueryOne.mockRejectedValueOnce(new Error("db down"));
      mockRunNile.mockRejectedValueOnce(new Error("nile down"));

      const statuses = await storeApi.getStoreStatus();

      expect(statuses.find((s) => s.id === "epic")?.available).toBe(false);
      expect(statuses.find((s) => s.id === "gog")?.available).toBe(false);
      expect(statuses.find((s) => s.id === "amazon")?.available).toBe(false);
    });

    it("supports compatibility helpers", async () => {
      mockRunLegendary.mockResolvedValueOnce(
        makeSidecarResult({ code: 0, stdout: JSON.stringify({ account: "alice" }) }),
      );
      mockQueryOne.mockResolvedValueOnce(null);
      mockRunNile.mockResolvedValueOnce(makeSidecarResult({ code: 0 }));

      await storeApi.authenticateLegendary();
      const epic = await storeApi.checkLegendaryStatus();
      const health = await storeApi.checkHealth();

      expect(epic.authenticated).toBe(true);
      expect(health.status).toBe("ok");
    });
  });
});
