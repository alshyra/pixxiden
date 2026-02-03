/**
 * Epic Games OAuth WebView Handler
 * Opens a webview for Epic Games OAuth flow and extracts the authorization code
 */

import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen as listenTauri } from "@tauri-apps/api/event";

interface EpicAuthResult {
  authorizationCode: string;
  succeeded: boolean;
}

export class EpicWebviewHandler {
  /**
   * Open Epic Games OAuth webview and wait for authorization code
   * Returns when user completes OAuth flow or closes the window
   */
  static async authenticate(): Promise<EpicAuthResult> {
    const oauthUrl =
      "https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code";

    console.log("[EpicWebviewHandler] Starting authentication...");
    console.log("[EpicWebviewHandler] OAuth URL:", oauthUrl);

    try {
      // Check if window already exists and close it
      const existingWindow = WebviewWindow.getByLabel("epic-auth");
      if (existingWindow) {
        console.log("[EpicWebviewHandler] Closing existing epic-auth window");
        await existingWindow.close();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Create webview window for OAuth
      console.log("[EpicWebviewHandler] Creating WebviewWindow...");
      const webview = new WebviewWindow("epic-auth", {
        url: oauthUrl,
        title: "Connexion Epic Games",
        width: 500,
        height: 700,
        resizable: true,
        fullscreen: false,
        center: true,
      });

      console.log("[EpicWebviewHandler] WebviewWindow instance created:", webview.label);

      // Wait for window to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for webview to be created"));
        }, 5000);

        webview.once("tauri://created", () => {
          clearTimeout(timeout);
          console.log("[EpicWebviewHandler] ✅ Webview window created and visible");
          resolve();
        });

        webview.once("tauri://error", (error) => {
          clearTimeout(timeout);
          console.error("[EpicWebviewHandler] ❌ Webview creation error:", error);
          reject(new Error(`Webview creation failed: ${JSON.stringify(error)}`));
        });
      });

      console.log("[EpicWebviewHandler] Webview is ready, setting up OAuth listeners...");

      // Promise that resolves when OAuth is complete
      const authPromise = new Promise<EpicAuthResult>(async (resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;

        try {
          // Listen for webview navigation events
          const unlisten = await listenTauri<{ url: string }>(
            "tauri://navigation",
            async (event) => {
              const url = event.payload.url;

              // Check if it's the authorization redirect
              if (url.startsWith("http://localhost/launcher/authorized")) {
                try {
                  // Extract code from URL
                  const urlObj = new URL(url);
                  const code = urlObj.searchParams.get("code");

                  if (code) {
                    // Clear timeout and close webview
                    if (timeoutId) clearTimeout(timeoutId);
                    unlisten();
                    await webview?.close();
                    resolve({
                      authorizationCode: code,
                      succeeded: true,
                    });
                  } else {
                    throw new Error("No authorization code in redirect URL");
                  }
                } catch (err) {
                  if (timeoutId) clearTimeout(timeoutId);
                  unlisten();
                  await webview?.close();
                  reject(err);
                }
              }
            },
          );

          // Timeout after 10 minutes
          timeoutId = setTimeout(
            () => {
              unlisten();
              if (webview) {
                webview.close().catch(console.error);
              }
              reject(new Error("Authentication timeout"));
            },
            10 * 60 * 1000,
          );
        } catch (err) {
          reject(err);
        }
      });

      return await authPromise;
    } catch (error) {
      // Clean up on error
      if (webview) {
        await webview.close().catch(console.error);
      }
      throw error;
    }
  }
}
