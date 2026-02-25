import { HttpClient } from '../../http/base-client.js';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APITimeoutError,
} from '../../errors.js';

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
});

function makeClient(overrides?: Record<string, unknown>) {
  return new HttpClient({
    apiKey: 'qk_test_key',
    orgId: 'org_123',
    fetch: mockFetch as unknown as typeof fetch,
    maxRetries: 0,
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('HttpClient', () => {
  it('builds correct URL with /api/v1 prefix', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = makeClient();

    await client.request({ method: 'GET', path: '/users' });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/v1/users');
  });

  it('sets Authorization, X-Tenant-ID, User-Agent, and Content-Type headers', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = makeClient();

    await client.request({ method: 'POST', path: '/users', body: { email: 'a@b.com' } });

    const calledHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders['Authorization']).toBe('Bearer qk_test_key');
    expect(calledHeaders['X-Tenant-ID']).toBe('org_123');
    expect(calledHeaders['User-Agent']).toMatch(/^querri-node\//);
    expect(calledHeaders['Content-Type']).toBe('application/json');
  });

  it('handles 204 No Content (returns undefined)', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 204, headers: {} }),
    );
    const client = makeClient();

    const result = await client.request({ method: 'DELETE', path: '/users/u1' });
    expect(result).toBeUndefined();
  });

  it('throws AuthenticationError on 401', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));
    const client = makeClient();

    await expect(
      client.request({ method: 'GET', path: '/users' }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Not found' }, 404));
    const client = makeClient();

    await expect(
      client.request({ method: 'GET', path: '/users/missing' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Rate limited' }, 429, { 'retry-after': '5' }),
    );
    const client = makeClient();

    await expect(
      client.request({ method: 'GET', path: '/users' }),
    ).rejects.toThrow(RateLimitError);
  });

  it('retries on 429 and 500 for GET requests', async () => {
    // First call: 429, second: 500, third: success
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ error: 'Rate limited' }, 429))
      .mockResolvedValueOnce(jsonResponse({ error: 'Server error' }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }));

    const client = makeClient({ maxRetries: 3 });

    const result = await client.request({ method: 'GET', path: '/users' });
    expect(result).toEqual({ data: 'ok' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry POST on 500', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Server error' }, 500));
    const client = makeClient({ maxRetries: 3 });

    await expect(
      client.request({ method: 'POST', path: '/users', body: { email: 'a@b.com' } }),
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws APITimeoutError on AbortError', async () => {
    mockFetch.mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });
    const client = makeClient({ timeout: 100 });

    await expect(
      client.request({ method: 'POST', path: '/chats', body: {} }),
    ).rejects.toThrow(APITimeoutError);
  });

  it('supports stream option (returns raw Response)', async () => {
    const streamResponse = new Response('streaming data', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    mockFetch.mockResolvedValueOnce(streamResponse);
    const client = makeClient();

    const result = await client.request<Response>({
      method: 'POST',
      path: '/chats/c1/messages',
      body: { prompt: 'hello' },
      stream: true,
    });

    expect(result).toBeInstanceOf(Response);
  });
});
