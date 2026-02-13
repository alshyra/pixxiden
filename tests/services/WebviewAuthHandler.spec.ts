import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListen = vi.fn();
const mockClose = vi.fn();
const mockOnCloseRequested = vi.fn();
const mockOnce = vi.fn();
// Variable used in mock constructor - TS and eslint cannot detect mock usage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _createdWindow: any = null;

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: class {
    constructor(..._args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      _createdWindow = this;
    }
    close = (...args: unknown[]) => mockClose(...args);
    onCloseRequested = (...args: unknown[]) => mockOnCloseRequested(...args);
    once = (...args: unknown[]) => mockOnce(...args);
  },
}));

import { WebviewAuthHandler } from "@/services/auth/WebviewAuthHandler";

describe("WebviewAuthHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    _createdWindow = null;
    (WebviewAuthHandler as any).instance = null;
    mockClose.mockResolvedValue(undefined);
  });

  it("resolves when auth-code event is received", async () => {
    let eventHandler: ((event: { payload: string }) => void) | undefined;

    mockListen.mockImplementationOnce(
      async (_eventName: string, handler: (event: { payload: string }) => void) => {
        eventHandler = handler;
        return vi.fn();
      },
    );
    mockOnCloseRequested.mockImplementationOnce(() => {});
    mockOnce.mockImplementationOnce(() => {});

    const handler = WebviewAuthHandler.getInstance();
    const promise = handler.openAuthWindow("epic", "https://auth");

    eventHandler?.({ payload: "auth-code-123" });

    await expect(promise).resolves.toBe("auth-code-123");
    expect(mockClose).toHaveBeenCalled();
  });

  it("rejects when window is closed by user", async () => {
    let closeHandler: (() => void) | undefined;

    mockListen.mockResolvedValueOnce(vi.fn());
    mockOnCloseRequested.mockImplementationOnce((handler: () => void) => {
      closeHandler = handler;
    });
    mockOnce.mockImplementationOnce(() => {});

    const handler = WebviewAuthHandler.getInstance();
    const promise = handler.openAuthWindow("gog", "https://auth");

    closeHandler?.();

    await expect(promise).rejects.toThrow("Authentication cancelled");
  });

  it("rejects on webview creation error event", async () => {
    let errorHandler: ((event: { payload: string }) => void) | undefined;

    mockListen.mockResolvedValueOnce(vi.fn());
    mockOnCloseRequested.mockImplementationOnce(() => {});
    mockOnce.mockImplementationOnce(
      (eventName: string, handler: (event: { payload: string }) => void) => {
        if (eventName === "tauri://error") errorHandler = handler;
      },
    );

    const handler = WebviewAuthHandler.getInstance();
    const promise = handler.openAuthWindow("epic", "https://auth");

    errorHandler?.({ payload: "boom" });

    await expect(promise).rejects.toThrow("Failed to create auth window: boom");
  });

  it("keeps singleton behavior", () => {
    const a = WebviewAuthHandler.getInstance();
    const b = WebviewAuthHandler.getInstance();
    expect(a).toBe(b);
  });
});
