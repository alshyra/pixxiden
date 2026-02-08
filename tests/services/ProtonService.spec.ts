/**
 * Tests for ProtonService
 *
 * ProtonService manages Proton-GE runner installation.
 * JS-first: path resolution via @tauri-apps/api/path, FS via @tauri-apps/plugin-fs.
 * Only download_file + extract_runner_tarball remain as Rust invoke commands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @tauri-apps/api/core (only download_file + extract_runner_tarball remain)
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock @tauri-apps/api/path (JS-first path resolution)
const mockHomeDir = vi.fn();
vi.mock("@tauri-apps/api/path", () => ({
  homeDir: () => mockHomeDir(),
}));

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

// Mock @tauri-apps/plugin-fs (JS-first FS operations)
const mockExists = vi.fn();
const mockReadDir = vi.fn();
const mockMkdir = vi.fn();
const mockRemove = vi.fn();
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (...args: unknown[]) => mockExists(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
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
    // Default: homeDir returns /home/user
    mockHomeDir.mockResolvedValue("/home/user");
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
        {
          key: "proton_ge_path",
          value: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        },
      ]);

      const path = await protonService.getProtonPath();
      expect(path).toBe("/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton");
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
        {
          key: "proton_ge_path",
          value: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        },
        { key: "proton_ge_installed_at", value: "2025-01-01T00:00:00.000Z" },
      ]);
      // JS-first: exists check via plugin-fs instead of invoke
      mockExists.mockImplementation((path: string) => {
        if (path.endsWith("GE-Proton9-15/proton")) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const config = await protonService.ensureProtonInstalled();
      expect(config).toEqual({
        version: "GE-Proton9-15",
        protonPath: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        installedAt: "2025-01-01T00:00:00.000Z",
      });
      expect(mockExists).toHaveBeenCalledWith(
        "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
      );
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

      // JS-first: mkdir for directory creation, exists for proton check
      mockMkdir.mockResolvedValue(undefined);
      mockExists.mockImplementation((path: string) => {
        if (path.endsWith("GE-Proton9-20/proton")) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      // Only download_file + extract_runner_tarball remain as Rust invoke
      mockInvoke.mockImplementation((cmd: string) => {
        switch (cmd) {
          case "download_file":
            return Promise.resolve(undefined);
          case "extract_runner_tarball":
            return Promise.resolve(undefined);
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

      // Verify directories were created (JS-first via plugin-fs)
      expect(mockMkdir).toHaveBeenCalledWith("/home/user/.local/share/pixxiden/runners", {
        recursive: true,
      });
      expect(mockMkdir).toHaveBeenCalledWith("/home/user/.local/share/pixxiden/prefixes", {
        recursive: true,
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
      mockMkdir.mockResolvedValue(undefined);
      mockExists.mockImplementation((path: string) => {
        if (path.endsWith("GE-Proton9-20/proton")) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "download_file") return Promise.resolve(undefined);
        if (cmd === "extract_runner_tarball") return Promise.resolve(undefined);
        return Promise.reject(new Error(`Unexpected invoke: ${cmd}`));
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
    it("should resolve prefixes directory from homeDir (JS-first)", async () => {
      mockHomeDir.mockResolvedValue("/home/user");
      const dir = await protonService.getPrefixesDir();
      expect(dir).toBe("/home/user/.local/share/pixxiden/prefixes");
    });
  });

  describe("getInstalledVersions", () => {
    it("should list runners via readDir + exists (JS-first)", async () => {
      mockExists.mockImplementation((path: string) => {
        if (path.endsWith("/runners")) return Promise.resolve(true);
        if (path.endsWith("GE-Proton9-15/proton")) return Promise.resolve(true);
        if (path.endsWith("GE-Proton9-20/proton")) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockReadDir.mockResolvedValue([
        { name: "GE-Proton9-15", isDirectory: true, isFile: false, isSymlink: false },
        { name: "GE-Proton9-20", isDirectory: true, isFile: false, isSymlink: false },
        { name: "some-file.tar.gz", isDirectory: false, isFile: true, isSymlink: false },
      ]);

      const versions = await protonService.getInstalledVersions();
      expect(versions).toEqual(["GE-Proton9-15", "GE-Proton9-20"]);
    });

    it("should return empty array when runners dir does not exist", async () => {
      mockExists.mockResolvedValue(false);
      const versions = await protonService.getInstalledVersions();
      expect(versions).toEqual([]);
    });
  });

  describe("removeVersion", () => {
    it("should remove via plugin-fs and clear config if it was the active version", async () => {
      mockExists.mockResolvedValue(true);
      mockRemove.mockResolvedValue(undefined);
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-15" },
        {
          key: "proton_ge_path",
          value: "/home/user/.local/share/pixxiden/runners/GE-Proton9-15/proton",
        },
      ]);
      mockDbExecute.mockResolvedValue(undefined);

      await protonService.removeVersion("GE-Proton9-15");

      expect(mockRemove).toHaveBeenCalledWith(
        "/home/user/.local/share/pixxiden/runners/GE-Proton9-15",
        { recursive: true },
      );
      expect(mockDbExecute).toHaveBeenCalledWith(
        "DELETE FROM settings WHERE key LIKE 'proton_ge_%'",
      );
    });

    it("should not clear config if removing a different version", async () => {
      mockExists.mockResolvedValue(true);
      mockRemove.mockResolvedValue(undefined);
      mockDbSelect.mockResolvedValue([
        { key: "proton_ge_version", value: "GE-Proton9-20" },
        {
          key: "proton_ge_path",
          value: "/home/user/.local/share/pixxiden/runners/GE-Proton9-20/proton",
        },
      ]);

      await protonService.removeVersion("GE-Proton9-15");

      expect(mockRemove).toHaveBeenCalledWith(
        "/home/user/.local/share/pixxiden/runners/GE-Proton9-15",
        { recursive: true },
      );
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
