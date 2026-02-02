/**
 * WebviewAuthHandler - Opens Tauri webviews for OAuth authentication
 */

import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";

export type AuthStore = "epic" | "gog";

export class WebviewAuthHandler {
  private static instance: WebviewAuthHandler | null = null;

  private constructor() {}

  static getInstance(): WebviewAuthHandler {
    if (!WebviewAuthHandler.instance) {
      WebviewAuthHandler.instance = new WebviewAuthHandler();
    }
    return WebviewAuthHandler.instance;
  }

  /**
   * Open authentication window and wait for code
   */
  async openAuthWindow(store: AuthStore, authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const windowLabel = `auth-${store}-${Date.now()}`;

      console.log(`🔐 Opening auth window for ${store}:`, authUrl);

      // Create webview window
      const webview = new WebviewWindow(windowLabel, {
        url: authUrl,
        title: `Login - ${store.toUpperCase()}`,
        width: 900,
        height: 700,
        center: true,
        resizable: true,
        focus: true,
      });

      let cleanup: (() => void) | null = null;
      let resolved = false;

      // Setup timeout (5 minutes)
      const timeout = setTimeout(
        () => {
          if (!resolved) {
            resolved = true;
            cleanup?.();
            webview.close().catch(() => {});
            reject(new Error("Authentication timeout"));
          }
        },
        5 * 60 * 1000,
      );

      // Listen for auth code event
      const unlistenPromise = listen<string>(`auth-code-${store}`, (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          cleanup?.();
          webview.close().catch(() => {});
          resolve(event.payload);
        }
      });

      // Handle window close
      webview.onCloseRequested(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          cleanup?.();
          reject(new Error("Authentication cancelled"));
        }
      });

      // Store cleanup function
      unlistenPromise.then((unlisten) => {
        cleanup = unlisten;
      });

      // Handle webview creation error
      webview.once("tauri://error", (e) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          cleanup?.();
          reject(new Error(`Failed to create auth window: ${e.payload}`));
        }
      });
    });
  }
}

export function getWebviewAuth(): WebviewAuthHandler {
  return WebviewAuthHandler.getInstance();
}
