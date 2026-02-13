/**
 * Vitest global setup file
 * Mocks Tauri plugins and common dependencies that require a runtime
 */

import { vi } from "vitest";

// =============================================================================
// GLOBAL MOCK OBJECTS - Reused across all tests
// =============================================================================

export const mockSystemApis = {
  shutdownSystem: vi.fn().mockResolvedValue(undefined),
  rebootSystem: vi.fn().mockResolvedValue(undefined),
  getSystemInfo: vi.fn().mockResolvedValue({
    os: "Linux",
    kernel: "6.0.0",
    desktop: "KDE",
  }),
  getDiskInfo: vi.fn().mockResolvedValue([]),
  checkForUpdates: vi.fn().mockResolvedValue({
    available: false,
    version: "1.0.0",
  }),
};

export const mockTauriWindow = {
  close: vi.fn().mockResolvedValue(undefined),
  unminimize: vi.fn().mockResolvedValue(undefined),
  show: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  setFocus: vi.fn().mockResolvedValue(undefined),
  setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
};

export const mockTauriEvent = {
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
  once: vi.fn().mockResolvedValue(() => {}),
};

export const gamepadHandlers: Record<string, (...args: any[]) => void> = {};

// =============================================================================
// VI.MOCK() CALLS - Must be at top-level for hoisting
// =============================================================================

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  attachConsole: vi.fn(),
  attachLogger: vi.fn(),
}));

// Mock navigator.getGamepads for @vueuse/core gamepad composable
Object.defineProperty(navigator, "getGamepads", {
  writable: true,
  value: vi.fn(() => []),
});

// Mock @/services/api
vi.mock("@/services/api", () => mockSystemApis);

// Mock @tauri-apps/api/window
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => mockTauriWindow,
}));

// Mock @tauri-apps/api/event
vi.mock("@tauri-apps/api/event", () => mockTauriEvent);

// Mock @/composables/useGamepad
vi.mock("@/composables/useGamepad", () => ({
  useGamepad: () => ({
    on: (event: string, handler: (...args: any[]) => void) => {
      gamepadHandlers[event] = handler;
    },
    off: (event: string) => {
      delete gamepadHandlers[event];
    },
    rumble: vi.fn(),
  }),
}));
