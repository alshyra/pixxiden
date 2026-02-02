/**
 * Core API utilities - Tauri invoke wrapper and mock mode
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;

export const getInvoke = async () => {
  if (_invoke) return _invoke;
  try {
    _invoke = tauriInvoke as typeof tauriInvoke;
    return _invoke;
  } catch (e) {
    console.warn("[API] Failed to import Tauri invoke (expected in E2E):", e);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _invoke = async (cmd: string, args?: Record<string, unknown>): Promise<any> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (win.__TAURI_INTERNALS__?.invoke) {
        return win.__TAURI_INTERNALS__.invoke(cmd, args);
      }
      throw new Error(`Tauri command '${cmd}' not available`);
    };
    return _invoke;
  }
};

export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const fn = await getInvoke();
  return fn(cmd, args) as Promise<T>;
};

// Mock mode - can be enabled via localStorage, URL param, or E2E test injection
export const isMockMode = (): boolean => {
  if (typeof window !== "undefined") {
    if ((window as unknown as { __MOCK_GAMES__?: unknown }).__MOCK_GAMES__) return true;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("mock")) return true;
    try {
      return localStorage.getItem("PIXXIDEN_MOCK_MODE") === "true";
    } catch {
      return false;
    }
  }
  return false;
};

export const enableMockMode = () => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.setItem("PIXXIDEN_MOCK_MODE", "true");
  }
};

export const disableMockMode = () => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.removeItem("PIXXIDEN_MOCK_MODE");
  }
};
