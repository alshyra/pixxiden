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
