import { HttpClient } from '../../http/base-client.js';
import {
  AuthenticationError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ValidationError,
  APITimeoutError,
} from '../../errors.js';

/** Wrap an error object the way FastAPI puts it on the wire for every /v1 error. */
function v1Error(error: Record<string, unknown>) {
  return { detail: { error } };
}

async function caught(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (err) {
    return err;
  }
  throw new Error('expected the request to reject');
}

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

  it('throws AuthenticationError on 401 with the server code, message and request id', async () => {
    // Verbatim live /v1 body (captured 2026-10-21).
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        v1Error({
          type: 'authentication_error',
          code: 'missing_api_key',
          message:
            'Authorization required. Provide a Bearer qk_ API key or a valid JWT token.',
          doc_url: 'https://docs.querri.com/api/errors#missing_api_key',
        }),
        401,
        { 'X-Request-Id': 'req_bcd3adccd74d40429159b73182bd6962' },
      ),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/users' }));
    expect(err).toBeInstanceOf(AuthenticationError);
    const e = err as AuthenticationError;
    expect(e.code).toBe('missing_api_key');
    expect(e.type).toBe('authentication_error');
    expect(e.message).toBe(
      'Authorization required. Provide a Bearer qk_ API key or a valid JWT token.',
    );
    expect(e.docUrl).toBe('https://docs.querri.com/api/errors#missing_api_key');
    expect(e.requestId).toBe('req_bcd3adccd74d40429159b73182bd6962');
  });

  it('throws PermissionError on 403 permission_denied with permission and reason', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        v1Error({
          type: 'permission_error',
          code: 'permission_denied',
          message: 'This action needs the dashboards.list.view permission.',
          permission: 'dashboards.list.view',
          reason: 'role_denied',
          doc_url: 'https://docs.querri.com/api/errors#permission_denied',
        }),
        403,
        { 'X-Permission-Denied': 'dashboards.list.view' },
      ),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/dashboards' }));
    expect(err).toBeInstanceOf(PermissionError);
    const e = err as PermissionError;
    expect(e.code).toBe('permission_denied');
    expect(e.permission).toBe('dashboards.list.view');
    expect(e.reason).toBe('role_denied');
    expect(e.message).toBe('This action needs the dashboards.list.view permission.');
  });

  it('throws NotFoundError on 404 with the server code', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        v1Error({
          type: 'not_found_error',
          code: 'role_not_found',
          message: 'No role with that id or key.',
          doc_url: 'https://docs.querri.com/api/errors#role_not_found',
        }),
        404,
      ),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/users/missing' }));
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).code).toBe('role_not_found');
    expect((err as NotFoundError).message).toBe('No role with that id or key.');
  });

  it('throws ValidationError (status 422) on a Pydantic validation body', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: [
            {
              type: 'greater_than_equal',
              loc: ['body', 'ttl'],
              msg: 'Input should be greater than or equal to 900',
              input: 1,
            },
          ],
        },
        422,
      ),
    );
    const client = makeClient();

    const err = await caught(
      client.request({ method: 'POST', path: '/embed/sessions', body: { ttl: 1 } }),
    );
    expect(err).toBeInstanceOf(ValidationError);
    const e = err as ValidationError;
    expect(e.status).toBe(422);
    expect(e.message).toBe(
      'Validation failed: body.ttl: Input should be greater than or equal to 900',
    );
  });

  it('keeps the header-sourced permission when the error body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('<html>Forbidden</html>', {
        status: 403,
        headers: { 'Content-Type': 'text/html', 'X-Permission-Denied': 'projects.view' },
      }),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/projects' }));
    expect(err).toBeInstanceOf(PermissionError);
    const e = err as PermissionError;
    expect(e.body).toBeNull();
    expect(e.message).toBe('Request failed with status 403');
    expect(e.permission).toBe('projects.view');
    expect(e.code).toBeUndefined();
  });

  it('still reads a flat { error, code } body (regression guard)', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Not found', code: 'session_not_found' }, 404),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/users/missing' }));
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Not found');
    expect((err as NotFoundError).code).toBe('session_not_found');
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        v1Error({
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
          message: 'Too many requests.',
        }),
        429,
        { 'retry-after': '5' },
      ),
    );
    const client = makeClient();

    const err = await caught(client.request({ method: 'GET', path: '/users' }));
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(5);
    expect((err as RateLimitError).code).toBe('rate_limit_exceeded');
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
