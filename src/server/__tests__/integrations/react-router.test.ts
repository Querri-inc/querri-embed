import { createSessionAction, createSessionHandler, createQuerriClient } from '../../integrations/react-router.js';
import { Querri } from '../../client.js';
import { APIError } from '../../errors.js';

const mockGetSession = vi.fn();

vi.mock('../../client.js', () => ({
  Querri: vi.fn().mockImplementation(() => ({
    getSession: mockGetSession,
  })),
}));

describe('createSessionAction (React Router v7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a Response with session data on success', async () => {
    const session = { session_token: 'tok_123', expires_in: 3600, user_id: 'u_1' };
    mockGetSession.mockResolvedValue(session);

    const action = createSessionAction({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ext_user' }),
    });

    const response = await action({ request, params: {}, context: undefined });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(session);
  });

  it('reads request body as GetSessionParams when no resolveParams', async () => {
    mockGetSession.mockResolvedValue({ session_token: 'tok', expires_in: 3600, user_id: 'u_1' });

    const action = createSessionAction({ apiKey: 'qk_test' });
    const sessionParams = { user: 'ext_user', ttl: 1800 };
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionParams),
    });

    await action({ request, params: {}, context: undefined });

    expect(mockGetSession).toHaveBeenCalledWith(sessionParams);
  });

  it('calls resolveParams with request, params, and context when provided', async () => {
    mockGetSession.mockResolvedValue({ session_token: 'tok', expires_in: 3600, user_id: 'u_1' });

    const resolveParams = vi.fn().mockResolvedValue({ user: 'resolved_user' });
    const action = createSessionAction({ apiKey: 'qk_test', resolveParams });

    const request = new Request('http://localhost/api/querri-session', { method: 'POST' });
    const routeParams = { id: '42' };
    const context = { user: { id: 'auth_user' } };

    await action({ request, params: routeParams, context });

    expect(resolveParams).toHaveBeenCalledWith({ request, params: routeParams, context });
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'resolved_user' });
  });

  it('returns error Response for APIError', async () => {
    const headers = new Headers();
    mockGetSession.mockRejectedValue(
      new APIError(403, { error: 'Forbidden', code: 'permission_denied' }, headers),
    );

    const action = createSessionAction({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ext_user' }),
    });

    const response = await action({ request, params: {}, context: undefined });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
    expect(body.code).toBe('permission_denied');
  });

  it('returns 500 for unknown errors', async () => {
    mockGetSession.mockRejectedValue(new Error('network failure'));

    const action = createSessionAction({ apiKey: 'qk_test' });
    const request = new Request('http://localhost/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ext_user' }),
    });

    const response = await action({ request, params: {}, context: undefined });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('createSessionHandler alias (React Router v7)', () => {
  it('is the same function as createSessionAction', () => {
    expect(createSessionHandler).toBe(createSessionAction);
  });
});

describe('createQuerriClient (React Router v7)', () => {
  it('returns a Querri instance', () => {
    const client = createQuerriClient({ apiKey: 'qk_test' });
    expect(client).toBeDefined();
    expect(Querri).toHaveBeenCalled();
  });
});
