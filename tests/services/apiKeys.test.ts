import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as apiKeysService from "../../src/services/api/apiKeys";
import * as fs from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";

// Mock the Tauri API
vi.mock("@tauri-apps/plugin-fs");
vi.mock("@tauri-apps/api/path");

describe("API Keys Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("needsSetup", () => {
    it("should return true when config file does not exist", async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);

      const result = await apiKeysService.needsSetup();

      expect(result).toBe(true);
    });

    it("should return true when setupCompleted is false", async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(
        JSON.stringify({
          setup_completed: false,
        }),
      );

      const result = await apiKeysService.needsSetup();

      expect(result).toBe(true);
    });

    it("should return false when setupCompleted is true", async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(
        JSON.stringify({
          setup_completed: true,
        }),
      );

      const result = await apiKeysService.needsSetup();

      expect(result).toBe(false);
    });
  });

  describe("getApiKeys", () => {
    it("should return default config when file does not exist", async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);

      const config = await apiKeysService.getApiKeys();

      expect(config.setupCompleted).toBe(false);
      expect(config.hasSteamgriddb).toBe(false);
      expect(config.hasIgdb).toBe(false);
      expect(config.hasSteam).toBe(false);
    });

    it("should parse and return config from file", async () => {
      const storedConfig = {
        steamgriddb_api_key: "test-key",
        setup_completed: true,
      };

      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(storedConfig));

      const config = await apiKeysService.getApiKeys();

      expect(config.steamgriddbApiKey).toBe("test-key");
      expect(config.setupCompleted).toBe(true);
      expect(config.hasSteamgriddb).toBe(true);
    });

    it("should compute hasSteam when both keys are present", async () => {
      const storedConfig = {
        steam_api_key: "key1234567890123456789",
        steam_id: "12345678901234567890",
      };

      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(storedConfig));

      const config = await apiKeysService.getApiKeys();

      expect(config.hasSteam).toBe(true);
    });

    it("should not compute hasSteam when only API key is present", async () => {
      const storedConfig = {
        steam_api_key: "key1234567890123456789",
      };

      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(storedConfig));

      const config = await apiKeysService.getApiKeys();

      expect(config.hasSteam).toBe(false);
    });
  });

  describe("saveApiKeys", () => {
    it("should merge updates with existing config", async () => {
      const existingConfig = {
        steamgriddb_api_key: "old-key",
        setup_completed: false,
      };

      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(existingConfig));
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await apiKeysService.saveApiKeys({
        igdbClientId: "new-igdb-id",
      });

      expect(vi.mocked(fs.writeTextFile)).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeTextFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);

      expect(writtenContent.steamgriddb_api_key).toBe("old-key");
      expect(writtenContent.igdb_client_id).toBe("new-igdb-id");
    });

    it("should mark setup as completed", async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await apiKeysService.saveApiKeys({ markSetupCompleted: true });

      const writeCall = vi.mocked(fs.writeTextFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);

      expect(writtenContent.setup_completed).toBe(true);
    });
  });

  describe("skipSetup", () => {
    it("should mark setup as completed", async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue(undefined);

      await apiKeysService.skipSetup();

      const writeCall = vi.mocked(fs.writeTextFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);

      expect(writtenContent.setup_completed).toBe(true);
    });
  });
});
