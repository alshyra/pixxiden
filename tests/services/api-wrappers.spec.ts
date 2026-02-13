import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import * as systemApi from "@/services/api/system";
import * as updatesApi from "@/services/api/updates";

describe("API wrappers", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    vi.clearAllMocks();
  });

  const mockInvokeValue = <T>(value: T) => mockInvoke.mockResolvedValueOnce(value);
  const mockInvokeError = (message: string) => mockInvoke.mockRejectedValueOnce(new Error(message));

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
});
