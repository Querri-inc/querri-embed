import {
  defineQuerriSessionHandler,
  createSessionHandler,
  createNuxtSessionHandler,
  createQuerriClient,
} from '../../integrations/nuxt.js';
import { Querri } from '../../client.js';
import { APIError } from '../../errors.js';

const mockGetSession = vi.fn();

vi.mock('../../client.js', () => ({
  Querri: vi.fn().mockImplementation(() => ({
    getSession: mockGetSession,
  })),
}));

describe('defineQuerriSessionHandler (Nuxt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getSession with body when no resolveParams', async () => {
    const session = { session_token: 'tok_123', expires_in: 3600, user_id: 'u_1' };
    mockGetSession.mockResolvedValue(session);

    const handler = defineQuerriSessionHandler({ apiKey: 'qk_test' });
    const result = await handler({ user: 'ext_user' });

    expect(result).toEqual(session);
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'ext_user' });
  });

  it('calls resolveParams when provided', async () => {
    const session = { session_token: 'tok_456', expires_in: 3600, user_id: 'u_2' };
    mockGetSession.mockResolvedValue(session);

    const resolveParams = vi.fn().mockResolvedValue({ user: 'resolved_user' });
    const handler = defineQuerriSessionHandler({ apiKey: 'qk_test', resolveParams });

    await handler({ body: { userId: 'test' }, headers: { host: 'localhost' } });

    expect(resolveParams).toHaveBeenCalledWith({
      body: { userId: 'test' },
      headers: { host: 'localhost' },
    });
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'resolved_user' });
  });
});

describe('createSessionHandler (Nuxt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads body from event and calls getSession', async () => {
    const session = { session_token: 'tok_789', expires_in: 3600, user_id: 'u_3' };
    mockGetSession.mockResolvedValue(session);

    // Mock h3 module
    vi.doMock('h3', () => ({
      readBody: vi.fn().mockResolvedValue({ user: 'event_user' }),
      getHeaders: vi.fn().mockReturnValue({ host: 'localhost' }),
    }));

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const fakeEvent = { node: { req: {}, res: {} } };

    const result = await handler(fakeEvent);

    expect(result).toEqual(session);
    expect(mockGetSession).toHaveBeenCalledWith({ user: 'event_user' });

    vi.doUnmock('h3');
  });
});

describe('createSessionHandler error handling (Nuxt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws on APIError from getSession', async () => {
    const apiError = new APIError(403, { error: 'Forbidden', code: 'forbidden' }, new Headers());
    mockGetSession.mockRejectedValue(apiError);

    vi.doMock('h3', () => ({
      readBody: vi.fn().mockResolvedValue({ user: 'test_user' }),
      getHeaders: vi.fn().mockReturnValue({}),
      createError: vi.fn().mockImplementation((opts: any) => {
        const err = new Error(opts.statusMessage);
        (err as any).statusCode = opts.statusCode;
        (err as any).data = opts.data;
        return err;
      }),
    }));

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const fakeEvent = { node: { req: {}, res: {} } };

    // Handler should throw — either via h3.createError (APIError path) or directly (re-throw)
    await expect(handler(fakeEvent)).rejects.toThrow();

    vi.doUnmock('h3');
  });

  it('re-throws unknown errors', async () => {
    const unknownError = new Error('Something went wrong');
    mockGetSession.mockRejectedValue(unknownError);

    vi.doMock('h3', () => ({
      readBody: vi.fn().mockResolvedValue({ user: 'test_user' }),
      getHeaders: vi.fn().mockReturnValue({}),
      createError: vi.fn(),
    }));

    const handler = createSessionHandler({ apiKey: 'qk_test' });
    const fakeEvent = { node: { req: {}, res: {} } };

    await expect(handler(fakeEvent)).rejects.toThrow('Something went wrong');

    vi.doUnmock('h3');
  });
});

describe('createNuxtSessionHandler alias (Nuxt)', () => {
  it('is the same function as createSessionHandler', () => {
    expect(createNuxtSessionHandler).toBe(createSessionHandler);
  });
});

describe('createQuerriClient (Nuxt)', () => {
  it('returns a Querri instance', () => {
    const client = createQuerriClient({ apiKey: 'qk_test' });
    expect(client).toBeDefined();
    expect(Querri).toHaveBeenCalled();
  });
});
