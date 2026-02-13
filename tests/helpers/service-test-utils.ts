export interface HttpMockResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<T>;
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
