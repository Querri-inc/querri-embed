import { Querri } from '../../client.js';

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
});

function makeClient() {
  return new Querri({ apiKey: 'qk_test', fetch: mockFetch as unknown as typeof fetch });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('EmbedResource', () => {
  it('createSession sends POST /api/v1/embed/sessions with user_id and ttl', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ session_token: 'tok_abc', expires_in: 3600, user_id: 'u1' }),
    );

    const client = makeClient();
    const session = await client.embed.createSession({ user_id: 'u1', ttl: 7200 });

    expect(session.session_token).toBe('tok_abc');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/embed/sessions');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.user_id).toBe('u1');
    expect(body.ttl).toBe(7200);
  });

  it('createSession sends role when set and surfaces role_id', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        session_token: 'tok_role',
        expires_in: 3600,
        user_id: 'u1',
        role_id: 'role_analyst',
      }),
    );

    const client = makeClient();
    const session = await client.embed.createSession({ user_id: 'u1', role: 'analyst' });

    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      user_id: 'u1',
      ttl: 3600,
      role: 'analyst',
    });
    expect(session.role_id).toBe('role_analyst');
  });

  it('createSession sends no role key when role is unset', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ session_token: 'tok_none', expires_in: 3600, user_id: 'u1' }),
    );

    const client = makeClient();
    const session = await client.embed.createSession({ user_id: 'u1' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(Object.keys(body)).not.toContain('role');
    expect(session.role_id).toBeUndefined();
  });

  it('createSession defaults ttl to 3600', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ session_token: 'tok_def', expires_in: 3600, user_id: 'u1' }),
    );

    const client = makeClient();
    await client.embed.createSession({ user_id: 'u1' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.ttl).toBe(3600);
  });

  it('refreshSession sends POST /api/v1/embed/sessions/refresh', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ session_token: 'tok_new', expires_in: 3600, user_id: 'u1' }),
    );

    const client = makeClient();
    const session = await client.embed.refreshSession('tok_old');

    expect(session.session_token).toBe('tok_new');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/embed/sessions/refresh');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ session_token: 'tok_old' });
  });

  it('refreshSession passes role_id through when the session has a role', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        session_token: 'tok_new',
        expires_in: 3600,
        user_id: 'u1',
        role_id: 'role_analyst',
      }),
    );

    const client = makeClient();
    const session = await client.embed.refreshSession('tok_old');

    expect(session.role_id).toBe('role_analyst');
  });

  it('listSessions items carry role_id when a session has a role', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            session_token: 'es_1',
            user_id: 'u1',
            origin: null,
            created_at: null,
            auth_method: 'api_key',
            role_id: 'role_analyst',
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    );

    const client = makeClient();
    const list = await client.embed.listSessions();

    expect(list.data[0].role_id).toBe('role_analyst');
  });

  it('listSessions sends GET /api/v1/embed/sessions', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], has_more: false, next_cursor: null }),
    );

    const client = makeClient();
    const list = await client.embed.listSessions();

    expect(list.data).toEqual([]);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/embed/sessions');
    expect(opts.method).toBe('GET');
  });

  it('revokeSession sends DELETE /api/v1/embed/sessions/{token}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ session_id: 'sess_1', revoked: true }),
    );

    const client = makeClient();
    const result = await client.embed.revokeSession('tok_abc');

    expect(result.revoked).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/embed/sessions/tok_abc');
    expect(opts.method).toBe('DELETE');
  });
});
