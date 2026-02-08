/**
 * Tests for ProtonService
 *
 * ProtonService manages Proton-GE runner installation via GitHub releases
 * and Rust commands for extraction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}));

// Mock DatabaseService
const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();
vi.mock("@/services/base/DatabaseService", () => ({
  DatabaseService: {
    getInstance: () => ({
      execute: mockDbExecute,
      select: mockDbSelect,
    }),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ProtonService } from "@/services/runners/ProtonService";

describe("ProtonService", () => {
  let protonService: ProtonService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (ProtonService as any).instance = null;
    protonService = ProtonService.getInstance();
  });

  afterEach(() => {
    (ProtonService as any).instance = null;
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const a = ProtonService.getInstance();
      const b = ProtonService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("getInstalledConfig", () => {
    it("should return null when no config in database", async () => {
      mockDbSelect.mockResolvedValue([]);
      const config = await protonService.getInstalledConfig();
      expect(config).toBeNull();
    });

    it("should return config when settings exist", async () => {
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-15" },
        {
          key: "proton_ge_path",
          value: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        },
        { key: "proton_ge_installed_at", value: "2025-01-01T00:00:00.000Z" },
      ]);

      const config = await protonService.getInstalledConfig();
      expect(config).toEqual({
        version: "GE-Proton9-15",
        protonPath: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        installedAt: "2025-01-01T00:00:00.000Z",
      });
    });

    it("should return null when only partial config exists", async () => {
      mockDbSelect.mockResolvedValue([{ key: "proton_ge_version", value: "GE-Proton9-15" }]);

      const config = await protonService.getInstalledConfig();
      expect(config).toBeNull();
    });

    it("should return null on database error", async () => {
      mockDbSelect.mockRejectedValue(new Error("DB error"));
      const config = await protonService.getInstalledConfig();
      expect(config).toBeNull();
    });
  });

  describe("getProtonPath", () => {
    it("should return proton path from config", async () => {
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-15" },
        { key: "proton_ge_path", value: "/path/to/proton" },
      ]);

      const path = await protonService.getProtonPath();
      expect(path).toBe("/path/to/proton");
    });

    it("should return null when not installed", async () => {
      mockDbSelect.mockResolvedValue([]);
      const path = await protonService.getProtonPath();
      expect(path).toBeNull();
    });
  });

  describe("ensureProtonInstalled", () => {
    it("should return existing config if runner exists on disk", async () => {
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-15" },
        { key: "proton_ge_path", value: "/path/to/proton" },
        { key: "proton_ge_installed_at", value: "2025-01-01T00:00:00.000Z" },
      ]);
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "check_runner_exists") return Promise.resolve(true);
        return Promise.reject(new Error(`Unexpected invoke: ${cmd}`));
      });

      const config = await protonService.ensureProtonInstalled();
      expect(config).toEqual({
        version: "GE-Proton9-15",
        protonPath: "/path/to/proton",
        installedAt: "2025-01-01T00:00:00.000Z",
      });
      expect(mockInvoke).toHaveBeenCalledWith("check_runner_exists", { version: "GE-Proton9-15" });
    });

    it("should download and install when no config exists", async () => {
      // No existing config
      mockDbSelect.mockResolvedValue([]);

      // Mock GitHub API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: "GE-Proton9-20",
            assets: [
              {
                name: "GE-Proton9-20.tar.gz",
                browser_download_url: "https://github.com/releases/GE-Proton9-20.tar.gz",
                size: 536870912,
              },
            ],
          }),
      });

      // Mock listen for download progress
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      // Mock invoke calls
      mockInvoke.mockImplementation((cmd: string) => {
        switch (cmd) {
          case "get_runners_dir":
            return Promise.resolve("/home/user/.local/share/pixxiden/runners");
          case "download_file":
            return Promise.resolve(undefined);
          case "extract_runner_tarball":
            return Promise.resolve(undefined);
          case "get_runner_path":
            return Promise.resolve("/home/user/.local/share/pixxiden/runners/GE-Proton9-20/proton");
          default:
            return Promise.reject(new Error(`Unexpected invoke: ${cmd}`));
        }
      });

      const config = await protonService.ensureProtonInstalled();

      expect(config).not.toBeNull();
      expect(config!.version).toBe("GE-Proton9-20");
      expect(config!.protonPath).toContain("GE-Proton9-20/proton");

      // Verify download was called
      expect(mockInvoke).toHaveBeenCalledWith("download_file", {
        url: "https://github.com/releases/GE-Proton9-20.tar.gz",
        dest: "/home/user/.local/share/pixxiden/runners/GE-Proton9-20.tar.gz",
      });

      // Verify extraction was called
      expect(mockInvoke).toHaveBeenCalledWith("extract_runner_tarball", {
        source: "/home/user/.local/share/pixxiden/runners/GE-Proton9-20.tar.gz",
        dest: "/home/user/.local/share/pixxiden/runners",
      });

      // Verify config was saved
      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO settings"), [
        "proton_ge_version",
        "GE-Proton9-20",
      ]);

      // Verify unlisten was called
      expect(mockUnlisten).toHaveBeenCalled();
    });

    it("should return null on download failure without throwing", async () => {
      mockDbSelect.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Rate limited",
      });

      const config = await protonService.ensureProtonInstalled();
      expect(config).toBeNull();
    });

    it("should deduplicate concurrent install calls", async () => {
      mockDbSelect.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: "GE-Proton9-20",
            assets: [
              {
                name: "GE-Proton9-20.tar.gz",
                browser_download_url: "https://example.com/file.tar.gz",
                size: 100,
              },
            ],
          }),
      });
      mockListen.mockResolvedValue(vi.fn());
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_runners_dir") return Promise.resolve("/tmp/runners");
        if (cmd === "download_file") return Promise.resolve(undefined);
        if (cmd === "extract_runner_tarball") return Promise.resolve(undefined);
        if (cmd === "get_runner_path") return Promise.resolve("/tmp/runners/GE-Proton9-20/proton");
        return Promise.resolve(undefined);
      });

      // Call twice concurrently
      const [result1, result2] = await Promise.all([
        protonService.ensureProtonInstalled(),
        protonService.ensureProtonInstalled(),
      ]);

      expect(result1).toBe(result2); // Same promise, same result
      // GitHub API should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPrefixesDir", () => {
    it("should invoke get_prefixes_dir Rust command", async () => {
      mockInvoke.mockResolvedValue("/home/user/.local/share/pixxiden/prefixes");
      const dir = await protonService.getPrefixesDir();
      expect(dir).toBe("/home/user/.local/share/pixxiden/prefixes");
      expect(mockInvoke).toHaveBeenCalledWith("get_prefixes_dir");
    });
  });

  describe("getInstalledVersions", () => {
    it("should invoke get_installed_runners Rust command", async () => {
      mockInvoke.mockResolvedValue(["GE-Proton9-15", "GE-Proton9-20"]);
      const versions = await protonService.getInstalledVersions();
      expect(versions).toEqual(["GE-Proton9-15", "GE-Proton9-20"]);
    });
  });

  describe("removeVersion", () => {
    it("should invoke remove_runner and clear config if it was the active version", async () => {
      mockInvoke.mockResolvedValue(undefined);
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-15" },
        { key: "proton_ge_path", value: "/path/to/proton" },
      ]);
      mockDbExecute.mockResolvedValue(undefined);

      await protonService.removeVersion("GE-Proton9-15");

      expect(mockInvoke).toHaveBeenCalledWith("remove_runner", { version: "GE-Proton9-15" });
      expect(mockDbExecute).toHaveBeenCalledWith(
        "DELETE FROM settings WHERE key LIKE 'proton_ge_%'",
      );
    });

    it("should not clear config if removing a different version", async () => {
      mockInvoke.mockResolvedValue(undefined);
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-20" },
        { key: "proton_ge_path", value: "/path/to/proton" },
      ]);

      await protonService.removeVersion("GE-Proton9-15");

      expect(mockInvoke).toHaveBeenCalledWith("remove_runner", { version: "GE-Proton9-15" });
      // Should NOT delete settings since active version is different
      expect(mockDbExecute).not.toHaveBeenCalledWith(
        "DELETE FROM settings WHERE key LIKE 'proton_ge_%'",
      );
    });
  });

  describe("isInstalling", () => {
    it("should return false initially", () => {
      expect(protonService.isInstalling()).toBe(false);
    });
  });
});
