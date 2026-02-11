/**
 * WindowService - Manages the main Pixxiden window lifecycle
 *
 * Handles focus/hide/restore operations for the main window,
 * coordinating with game launch/exit to provide a seamless
 * fullscreen launcher experience (SteamOS-style).
 *
 * On Wayland/KDE, window focus from background is restricted.
 * The Rust backend handles low-level window operations via Tauri's
 * window API, while this service provides the JS-first orchestration.
 */

import { invoke } from "@tauri-apps/api/core";
import { info, warn, error as logError } from "@tauri-apps/plugin-log";

export class WindowService {
  private static instance: WindowService | null = null;
  private _isGameActive = false;

  private constructor() {}

  static getInstance(): WindowService {
    if (!WindowService.instance) {
      WindowService.instance = new WindowService();
    }
    return WindowService.instance;
  }

  /** Whether a game is currently in the foreground */
  get isGameActive(): boolean {
    return this._isGameActive;
  }

  /**
   * Focus the main Pixxiden window (bring to foreground).
   * Called when the PS/Guide button is pressed while a game is running.
   */
  async focusMainWindow(): Promise<void> {
    try {
      await invoke("focus_main_window");
      await info("[Window] Main window focused");
    } catch (err) {
      await logError(`[Window] Failed to focus main window: ${err}`);
    }
  }

  /**
   * Hide the main window so a game takes the foreground.
   * Disables alwaysOnTop and minimizes the window.
   * Called right before launching a game.
   */
  async hideForGame(): Promise<void> {
    try {
      this._isGameActive = true;
      await invoke("hide_main_window");
      await info("[Window] Main window hidden for game");
    } catch (err) {
      await logError(`[Window] Failed to hide main window: ${err}`);
    }
  }

  /**
   * Restore the main window after a game exits.
   * Re-enables alwaysOnTop and brings window to front.
   * Called automatically when the game process exits.
   */
  async restoreAfterGame(): Promise<void> {
    try {
      this._isGameActive = false;
      await invoke("restore_main_window");
      await info("[Window] Main window restored after game exit");
    } catch (err) {
      await logError(`[Window] Failed to restore main window: ${err}`);
    }
  }

  /**
   * Convenience: toggle between game and launcher.
   * If game is active → focus launcher.
   * If launcher is active → nothing (game overlay handles this).
   */
  async bringToFront(): Promise<void> {
    if (this._isGameActive) {
      await this.focusMainWindow();
    } else {
      await warn("[Window] bringToFront called but no game active");
    }
  }
}
