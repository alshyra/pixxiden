/**
 * WindowService tests
 * Validates window management (focus, hide, restore) via Tauri invoke.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

import { WindowService } from "@/services/window/WindowService";

describe("WindowService", () => {
  let service: WindowService;

  beforeEach(() => {
    // Reset singleton for clean test state
    (WindowService as any).instance = null;
    service = WindowService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    (WindowService as any).instance = null;
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const a = WindowService.getInstance();
      const b = WindowService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("focusMainWindow", () => {
    it("should invoke focus_main_window command", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await service.focusMainWindow();

      expect(mockInvoke).toHaveBeenCalledWith("focus_main_window");
    });

    it("should handle errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("focus failed"));

      // Should not throw
      await service.focusMainWindow();

      expect(mockInvoke).toHaveBeenCalledWith("focus_main_window");
    });
  });

  describe("hideForGame", () => {
    it("should invoke hide_main_window and set isGameActive", async () => {
      mockInvoke.mockResolvedValue(undefined);

      expect(service.isGameActive).toBe(false);

      await service.hideForGame();

      expect(mockInvoke).toHaveBeenCalledWith("hide_main_window");
      expect(service.isGameActive).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("hide failed"));

      await service.hideForGame();

      // isGameActive should still be set even on error
      expect(service.isGameActive).toBe(true);
    });
  });

  describe("restoreAfterGame", () => {
    it("should invoke restore_main_window and reset isGameActive", async () => {
      mockInvoke.mockResolvedValue(undefined);

      // First hide
      await service.hideForGame();
      expect(service.isGameActive).toBe(true);

      // Then restore
      await service.restoreAfterGame();

      expect(mockInvoke).toHaveBeenCalledWith("restore_main_window");
      expect(service.isGameActive).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("restore failed"));

      await service.hideForGame();
      await service.restoreAfterGame();

      // isGameActive should be reset even on error
      expect(service.isGameActive).toBe(false);
    });
  });

  describe("bringToFront", () => {
    it("should focus main window when game is active", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await service.hideForGame();
      await service.bringToFront();

      expect(mockInvoke).toHaveBeenCalledWith("focus_main_window");
    });

    it("should not focus when no game is active", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await service.bringToFront();

      expect(mockInvoke).not.toHaveBeenCalledWith("focus_main_window");
    });
  });

  describe("game lifecycle", () => {
    it("should handle full hide → focus → restore cycle", async () => {
      mockInvoke.mockResolvedValue(undefined);

      // 1. Hide for game launch
      await service.hideForGame();
      expect(service.isGameActive).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("hide_main_window");

      // 2. PS button pressed — bring to front
      await service.focusMainWindow();
      expect(mockInvoke).toHaveBeenCalledWith("focus_main_window");
      expect(service.isGameActive).toBe(true); // still active

      // 3. Game exits — restore
      await service.restoreAfterGame();
      expect(service.isGameActive).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith("restore_main_window");
    });
  });
});
