import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Tauri APIs
const mockHomeDir = vi.fn();
const mockReadTextFile = vi.fn();
const mockExists = vi.fn();

// Mock GameRepository
const mockGetGameById = vi.fn();
const mockUpdateInstallation = vi.fn();

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: () => mockHomeDir(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  exists: (...args: unknown[]) => mockExists(...args),
}));

vi.mock("@/lib/database", () => ({
  GameRepository: {
    getInstance: vi.fn(() => ({
      getGameById: mockGetGameById,
      updateInstallation: mockUpdateInstallation,
    })),
  },
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("HeroicImportService", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockHomeDir.mockResolvedValue("/home/user");
    
    // Reset singleton to ensure fresh instance for each test
    const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
    (HeroicImportService as any).instance = null;
  });

  describe("Singleton pattern", () => {
    it("returns the same instance", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const instance1 = HeroicImportService.getInstance();
      const instance2 = HeroicImportService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("isAvailable", () => {
    it("returns true when Heroic config exists", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValueOnce(true);

      const available = await service.isAvailable();

      expect(available).toBe(true);
      expect(mockExists).toHaveBeenCalledWith("/home/user/.config/heroic/gog_store/installed.json");
    });

    it("returns false when Heroic config does not exist", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

      const available = await service.isAvailable();

      expect(available).toBe(false);
    });

    it("checks Flatpak location if native location not found", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists
        .mockResolvedValueOnce(false) // Native location
        .mockResolvedValueOnce(true); // Flatpak location

      const available = await service.isAvailable();

      expect(available).toBe(true);
      expect(mockExists).toHaveBeenCalledWith(
        "/home/user/.var/app/com.heroicgameslauncher.hgl/config/heroic/gog_store/installed.json",
      );
    });
  });

  describe("getInstalledGames", () => {
    it("returns empty array when Heroic not available", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(false);

      const games = await service.getInstalledGames();

      expect(games).toEqual([]);
    });

    it("parses GOG installed games", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              executable: "game.exe",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
              language: "en-US",
            },
          ],
        }),
      );

      // Mock game config (no config file)
      mockExists.mockResolvedValueOnce(false);

      const games = await service.getInstalledGames();

      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        gameId: "gog-123456789",
        storeId: "123456789",
        store: "gog",
        installPath: "/games/test-game",
        installSize: "10GB",
        platform: "windows",
      });
    });

    it("skips DLC entries", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
            },
            {
              appName: "987654321",
              platform: "windows",
              install_path: "/games/dlc",
              install_size: "1GB",
              is_dlc: true,
            },
          ],
        }),
      );

      mockExists.mockResolvedValue(false); // No game configs

      const games = await service.getInstalledGames();

      expect(games).toHaveLength(1);
      expect(games[0].gameId).toBe("gog-123456789");
    });

    it("reads wine/proton config from GamesConfig", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      // Mock exists: first call for heroic config dir, second for game config file
      mockExists.mockResolvedValueOnce(true); // heroic config dir exists
      mockExists.mockResolvedValueOnce(true); // game config file exists

      // Mock installed.json
      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
            },
          ],
        }),
      );

      // Mock game config file
      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          "123456789": {
            winePrefix: "/home/user/Games/Heroic/Prefixes/default/TestGame",
            wineVersion: {
              bin: "/usr/share/steam/compatibilitytools.d/proton-cachyos/proton",
              name: "proton-cachyos",
              type: "proton",
            },
            targetExe: "/games/test-game/game.exe",
          },
          version: "v0",
        }),
      );

      const games = await service.getInstalledGames();

      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({
        winePrefix: "/home/user/Games/Heroic/Prefixes/default/TestGame",
        wineVersion: "proton-cachyos",
        runner: "proton",
        wineBin: "/usr/share/steam/compatibilitytools.d/proton-cachyos/proton",
        targetExe: "/games/test-game/game.exe",
      });
    });
        targetExe: "/games/test-game/game.exe",
      });
    });

    it("handles malformed JSON gracefully", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValueOnce("invalid json");

      const games = await service.getInstalledGames();

      expect(games).toEqual([]);
    });
  });

  describe("mergeInstallations", () => {
    it("returns 0 when no Heroic games found", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(false);

      const merged = await service.mergeInstallations();

      expect(merged).toBe(0);
      expect(mockUpdateInstallation).not.toHaveBeenCalled();
    });

    it("updates installation data for existing games", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
            },
          ],
        }),
      );

      mockExists.mockResolvedValueOnce(false); // No game config

      mockGetGameById.mockResolvedValueOnce({
        id: "gog-123456789",
        info: { title: "Test Game" },
      });

      mockUpdateInstallation.mockResolvedValueOnce(undefined);

      const merged = await service.mergeInstallations();

      expect(merged).toBe(1);
      expect(mockUpdateInstallation).toHaveBeenCalledWith("gog-123456789", {
        installed: true,
        installPath: "/games/test-game",
        installSize: "10GB",
        winePrefix: "",
        wineVersion: "",
        runner: "",
        runnerPath: "",
        executablePath: "",
      });
    });

    it("skips games not in database", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      // Mock exists: first for heroic config dir, then for game config
      mockExists.mockResolvedValueOnce(true); // heroic config dir
      mockExists.mockResolvedValueOnce(false); // game config doesn't exist

      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
            },
          ],
        }),
      );

      mockGetGameById.mockResolvedValueOnce(null); // Game not in DB

      const merged = await service.mergeInstallations();

      expect(merged).toBe(0);
      expect(mockUpdateInstallation).not.toHaveBeenCalled();
    });

    it("merges wine config when available", async () => {
      const { HeroicImportService } = await import("@/services/heroic/HeroicImportService");
      const service = HeroicImportService.getInstance();

      // Mock exists: first for heroic config dir, then for game config
      mockExists.mockResolvedValueOnce(true); // heroic config dir
      mockExists.mockResolvedValueOnce(true); // game config exists

      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          installed: [
            {
              appName: "123456789",
              platform: "windows",
              install_path: "/games/test-game",
              install_size: "10GB",
              is_dlc: false,
            },
          ],
        }),
      );

      mockReadTextFile.mockResolvedValueOnce(
        JSON.stringify({
          "123456789": {
            winePrefix: "/prefix",
            wineVersion: { bin: "/bin/proton", name: "proton-ge", type: "proton" },
            targetExe: "/game.exe",
          },
          version: "v0",
        }),
      );

      mockGetGameById.mockResolvedValueOnce({
        id: "gog-123456789",
        info: { title: "Test Game" },
      });

      const merged = await service.mergeInstallations();

      expect(merged).toBe(1);
      expect(mockUpdateInstallation).toHaveBeenCalledWith("gog-123456789", {
        installed: true,
        installPath: "/games/test-game",
        installSize: "10GB",
        winePrefix: "/prefix",
        wineVersion: "proton-ge",
        runner: "proton",
        runnerPath: "/bin/proton",
        executablePath: "/game.exe",
      });
    });
  });
});
