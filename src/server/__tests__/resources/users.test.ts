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

describe('UsersResource', () => {
  it('list() sends GET /api/v1/users', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], has_more: false, next_cursor: null }),
    );

    const client = makeClient();
    const page = await client.users.list();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users');
    expect(opts.method).toBe('GET');
  });

  it('retrieve() sends GET /api/v1/users/{id}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'u1', email: 'a@b.com', role: 'viewer', external_id: null, first_name: null, last_name: null, created_at: null }),
    );

    const client = makeClient();
    const user = await client.users.retrieve('u1');

    expect(user.id).toBe('u1');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users/u1');
    expect(opts.method).toBe('GET');
  });

  it('create() sends POST /api/v1/users', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'u2', email: 'new@b.com', role: 'viewer', external_id: null, first_name: null, last_name: null, created_at: null }),
    );

    const client = makeClient();
    const user = await client.users.create({ email: 'new@b.com' });

    expect(user.id).toBe('u2');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ email: 'new@b.com' });
  });

  it('update() sends PATCH /api/v1/users/{id}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'u1', email: 'a@b.com', role: 'admin', external_id: null, first_name: null, last_name: null, created_at: null }),
    );

    const client = makeClient();
    const user = await client.users.update('u1', { role: 'admin' });

    expect(user.role).toBe('admin');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users/u1');
    expect(opts.method).toBe('PATCH');
  });

  it('del() sends DELETE /api/v1/users/{id}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'u1', deleted: true }),
    );

    const client = makeClient();
    const result = await client.users.del('u1');

    expect(result.deleted).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users/u1');
    expect(opts.method).toBe('DELETE');
  });

  it('getOrCreate() sends PUT /api/v1/users/external/{externalId}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'u3', email: 'ext@b.com', role: 'viewer', external_id: 'ext_1', first_name: null, last_name: null, created_at: null }),
    );

    const client = makeClient();
    const user = await client.users.getOrCreate('ext_1', { email: 'ext@b.com' });

    expect(user.external_id).toBe('ext_1');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/users/external/ext_1');
    expect(opts.method).toBe('PUT');
  });
});
