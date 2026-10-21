import { createSessionHandler, createQuerriMiddleware, createQuerriClient } from '../../integrations/angular.js';
import { Querri } from '../../client.js';
import { APIError } from '../../errors.js';

const mockGetSession = vi.fn();

vi.mock('../../client.js', () => ({
  Querri: vi.fn().mockImplementation(() => ({
    getSession: mockGetSession,
  })),
}));

describe('createSessionHandler (Express/Angular)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls res.json with session data on success', async () => {
    const session = { session_token: 'tok_123', expires_in: 3600, user_id: 'u_1' };
    mockGetSession.mockResolvedValue(session);

    const middleware = createSessionHandler({ apiKey: 'qk_test' });
    const req = {
      body: {},
      headers: {} as Record<string, string | undefined>,
    };
    const jsonFn = vi.fn();
    const res = { json: jsonFn, status: vi.fn().mockReturnValue({ json: vi.fn() }) };

    await middleware(req, res);

    expect(jsonFn).toHaveBeenCalledWith(session);
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'embed_anonymous' });
  });

  it('calls resolveParams when provided', async () => {
    const session = { session_token: 'tok_456', expires_in: 3600, user_id: 'u_2' };
    mockGetSession.mockResolvedValue(session);

    const resolveParams = vi.fn().mockResolvedValue({ user: 'resolved_user' });
    const middleware = createSessionHandler({ apiKey: 'qk_test', resolveParams });
    const req = {
      body: {},
      headers: { authorization: 'Bearer tok' } as Record<string, string | undefined>,
    };
    const jsonFn = vi.fn();
    const res = { json: jsonFn, status: vi.fn().mockReturnValue({ json: vi.fn() }) };

    await middleware(req, res);

    expect(resolveParams).toHaveBeenCalledWith(req);
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'resolved_user' });
    expect(jsonFn).toHaveBeenCalledWith(session);
  });

  it('returns error for APIError', async () => {
    const headers = new Headers();
    mockGetSession.mockRejectedValue(
      new APIError(
        403,
        {
          detail: {
            error: {
              type: 'permission_error',
              code: 'permission_denied',
              message: 'This action needs the dashboards.list.view permission.',
              permission: 'dashboards.list.view',
              reason: 'role_denied',
              doc_url: 'https://docs.querri.com/api/errors#permission_denied',
            },
          },
        },
        headers,
      ),
    );

    const middleware = createSessionHandler({ apiKey: 'qk_test' });
    const req = { body: { user: 'ext_user' }, headers: {} as Record<string, string | undefined> };
    const errorJson = vi.fn();
    const res = { json: vi.fn(), status: vi.fn().mockReturnValue({ json: errorJson }) };

    await middleware(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(errorJson).toHaveBeenCalledTimes(1);
    const body = errorJson.mock.calls[0][0];
    expect(body).toEqual({
      error: 'This action needs the dashboards.list.view permission.',
      code: 'permission_denied',
      permission: 'dashboards.list.view',
      reason: 'role_denied',
      doc_url: 'https://docs.querri.com/api/errors#permission_denied',
    });
  });

  it('returns 500 for unknown errors', async () => {
    mockGetSession.mockRejectedValue(new Error('network failure'));

    const middleware = createSessionHandler({ apiKey: 'qk_test' });
    const req = { body: { user: 'ext_user' }, headers: {} as Record<string, string | undefined> };
    const errorJson = vi.fn();
    const res = { json: vi.fn(), status: vi.fn().mockReturnValue({ json: errorJson }) };

    await middleware(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorJson).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('createQuerriMiddleware alias (Express/Angular)', () => {
  it('is the same function as createSessionHandler', () => {
    expect(createQuerriMiddleware).toBe(createSessionHandler);
  });
});

describe('createQuerriClient (Express/Angular)', () => {
  it('returns a Querri instance', () => {
    const client = createQuerriClient({ apiKey: 'qk_test' });
    expect(client).toBeDefined();
    expect(Querri).toHaveBeenCalled();
  });
});
