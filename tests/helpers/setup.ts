/**
 * Vitest global setup file
 * Mocks Tauri plugins that require a runtime (not available in test environment)
 */

import { vi } from "vitest";

// Mock @tauri-apps/plugin-log — these functions call invoke() which requires Tauri runtime
vi.mock("@tauri-apps/plugin-log", () => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  attachConsole: vi.fn(),
  attachLogger: vi.fn(),
}));
