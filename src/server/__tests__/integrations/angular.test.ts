import { createQuerriMiddleware, createSessionHandler, createQuerriClient } from '../../integrations/angular.js';
import { Querri } from '../../client.js';
import { APIError } from '../../errors.js';

const mockGetSession = vi.fn();

vi.mock('../../client.js', () => ({
  Querri: vi.fn().mockImplementation(() => ({
    getSession: mockGetSession,
  })),
}));

describe('createQuerriMiddleware (Express/Angular)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls res.json with session data on success', async () => {
    const session = { session_token: 'tok_123', expires_in: 3600, user_id: 'u_1' };
    mockGetSession.mockResolvedValue(session);

    const middleware = createQuerriMiddleware({ apiKey: 'qk_test' });
    const req = {
      body: { user: 'ext_user' },
      headers: {} as Record<string, string | undefined>,
    };
    const jsonFn = vi.fn();
    const res = { json: jsonFn, status: vi.fn().mockReturnValue({ json: vi.fn() }) };

    await middleware(req, res);

    expect(jsonFn).toHaveBeenCalledWith(session);
  });

  it('returns error for APIError', async () => {
    const headers = new Headers();
    mockGetSession.mockRejectedValue(
      new APIError(403, { error: 'Forbidden', code: 'permission_denied' }, headers),
    );

    const middleware = createQuerriMiddleware({ apiKey: 'qk_test' });
    const req = { body: { user: 'ext_user' }, headers: {} as Record<string, string | undefined> };
    const errorJson = vi.fn();
    const res = { json: vi.fn(), status: vi.fn().mockReturnValue({ json: errorJson }) };

    await middleware(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(errorJson).toHaveBeenCalledWith({ error: 'Forbidden', code: 'permission_denied' });
  });

  it('returns 500 for unknown errors', async () => {
    mockGetSession.mockRejectedValue(new Error('network failure'));

    const middleware = createQuerriMiddleware({ apiKey: 'qk_test' });
    const req = { body: { user: 'ext_user' }, headers: {} as Record<string, string | undefined> };
    const errorJson = vi.fn();
    const res = { json: vi.fn(), status: vi.fn().mockReturnValue({ json: errorJson }) };

    await middleware(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorJson).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('createSessionHandler alias (Express/Angular)', () => {
  it('is the same function as createQuerriMiddleware', () => {
    expect(createSessionHandler).toBe(createQuerriMiddleware);
  });
});

describe('createQuerriClient (Express/Angular)', () => {
  it('returns a Querri instance', () => {
    const client = createQuerriClient({ apiKey: 'qk_test' });
    expect(client).toBeDefined();
    expect(Querri).toHaveBeenCalled();
  });
});
