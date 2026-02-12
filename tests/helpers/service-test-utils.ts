import { vi } from "vitest";

export const mockInvoke = vi.fn();

export function resetServiceTestUtils(): void {
  mockInvoke.mockReset();
}

export function mockInvokeValue<T>(value: T): void {
  mockInvoke.mockResolvedValueOnce(value);
}

export function mockInvokeError(message: string): void {
  mockInvoke.mockRejectedValueOnce(new Error(message));
}

export interface SidecarResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface HttpMockResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<T>;
}

export function makeSidecarResult(result: Partial<SidecarResult> = {}): SidecarResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    ...result,
  };
}

export function makeHttpResponse<T>(
  payload: T,
  overrides: Partial<Omit<HttpMockResponse<T>, "json">> = {},
): HttpMockResponse<T> {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
    ...overrides,
  };
}
