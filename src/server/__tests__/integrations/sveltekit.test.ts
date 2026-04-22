import { createSessionHandler, createQuerriClient } from '../../integrations/sveltekit.js';
import { Querri } from '../../client.js';
import { APIError } from '../../errors.js';

const mockGetSession = vi.fn();

vi.mock('../../client.js', () => ({
  Querri: vi.fn().mockImplementation(() => ({
    getSession: mockGetSession,
  })),
}));

describe('createSessionHandler (SvelteKit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a Response with session data on success', async () => {
    const session = { session_token: 'tok_123', expires_in: 3600, user_id: 'u_1' };
    mockGetSession.mockResolvedValue(session);

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
    });

    const response = await handler({ request });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(session);
  });

  it('uses anonymous user when no resolveParams', async () => {
    mockGetSession.mockResolvedValue({ session_token: 'tok', expires_in: 3600, user_id: 'u_1' });

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
    });

    await handler({ request });

    expect(mockGetSession).toHaveBeenCalledWith({ user: 'embed_anonymous' });
  });

  it('calls resolveParams with event when provided', async () => {
    mockGetSession.mockResolvedValue({ session_token: 'tok', expires_in: 3600, user_id: 'u_1' });

    const resolveParams = vi.fn().mockResolvedValue({ user: 'resolved_user' });
    const handler = createSessionHandler({ apiKey: 'qk_test', resolveParams });

    const request = new Request('http://localhost/api/querri-session', { method: 'POST' });
    const locals = { user: { id: 'auth_user' } };

    await handler({ request, locals });

    expect(resolveParams).toHaveBeenCalledWith({ request, locals });
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'resolved_user' });
  });

  it('returns error Response for APIError', async () => {
    mockGetSession.mockRejectedValue(
      new APIError(403, { error: 'Forbidden', code: 'permission_denied' }, new Headers()),
    );

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ext_user' }),
    });

    const response = await handler({ request });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
    expect(body.code).toBe('permission_denied');
  });

  it('returns 500 for unknown errors', async () => {
    mockGetSession.mockRejectedValue(new Error('network failure'));

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ext_user' }),
    });

    const response = await handler({ request });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('createQuerriClient (SvelteKit)', () => {
  it('returns a Querri instance', () => {
    const client = createQuerriClient({ apiKey: 'qk_test' });
    expect(client).toBeDefined();
    expect(Querri).toHaveBeenCalled();
  });
});
