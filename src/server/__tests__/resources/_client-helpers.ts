import { Querri } from '../../client.js';

export type MockFetch = ReturnType<typeof vi.fn>;

export function makeMockFetch(): MockFetch {
  return vi.fn();
}

export function makeClient(mockFetch: MockFetch) {
  return new Querri({
    apiKey: 'qk_test',
    fetch: mockFetch as unknown as typeof fetch,
    maxRetries: 0,
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Shape accepted by `normalizePage` for empty list mocks. */
export const emptyPage = { data: [], has_more: false, next_cursor: null };

/** Extract [url, fetchOpts] from the first call of a mocked fetch. */
export function firstCall(mockFetch: MockFetch): {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
} {
  const [url, opts] = mockFetch.mock.calls[0];
  return {
    url: url as string,
    method: opts.method as string,
    body: opts.body,
    headers: opts.headers as Record<string, string>,
  };
}
