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

const POLICY_STUB = {
  id: 'pol_1',
  name: 'test-policy',
  description: null,
  source_ids: [],
  row_filters: [],
  user_count: 0,
  created_at: null,
  updated_at: null,
};

describe('PoliciesResource', () => {
  it('create() sends POST /access/policies', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(POLICY_STUB));
    const client = makeClient();

    const policy = await client.policies.create({ name: 'test-policy' });

    expect(policy.id).toBe('pol_1');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'test-policy' });
  });

  it('retrieve() sends GET /access/policies/{id}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(POLICY_STUB));
    const client = makeClient();

    const policy = await client.policies.retrieve('pol_1');

    expect(policy.name).toBe('test-policy');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies/pol_1');
    expect(opts.method).toBe('GET');
  });

  it('list() sends GET /access/policies', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([POLICY_STUB]));
    const client = makeClient();

    const policies = await client.policies.list();

    expect(policies).toHaveLength(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies');
    expect(opts.method).toBe('GET');
  });

  it('update() sends PATCH /access/policies/{id}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'pol_1', updated: true }));
    const client = makeClient();

    const result = await client.policies.update('pol_1', { name: 'renamed' });

    expect(result.updated).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies/pol_1');
    expect(opts.method).toBe('PATCH');
  });

  it('del() sends DELETE /access/policies/{id}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'pol_1', deleted: true }));
    const client = makeClient();

    const result = await client.policies.del('pol_1');

    expect(result.deleted).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies/pol_1');
    expect(opts.method).toBe('DELETE');
  });

  it('assignUsers sends POST /access/policies/{id}/users', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ policy_id: 'pol_1', assigned_user_ids: ['u1', 'u2'] }),
    );
    const client = makeClient();

    const result = await client.policies.assignUsers('pol_1', { user_ids: ['u1', 'u2'] });

    expect(result.assigned_user_ids).toEqual(['u1', 'u2']);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies/pol_1/users');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ user_ids: ['u1', 'u2'] });
  });

  it('removeUser sends DELETE /access/policies/{id}/users/{userId}', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ policy_id: 'pol_1', user_id: 'u1', removed: true }),
    );
    const client = makeClient();

    const result = await client.policies.removeUser('pol_1', 'u1');

    expect(result.removed).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/policies/pol_1/users/u1');
    expect(opts.method).toBe('DELETE');
  });

  it('resolve sends POST /access/resolve', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ user_id: 'u1', source_id: 's1', resolved_filters: [], where_clause: '1=1' }),
    );
    const client = makeClient();

    const result = await client.policies.resolve('u1', 's1');

    expect(result.where_clause).toBe('1=1');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/resolve');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ user_id: 'u1', source_id: 's1' });
  });

  it('columns sends GET /access/columns', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse([{ source_id: 's1', source_name: 'Sales', columns: [{ name: 'region', type: 'text' }] }]),
    );
    const client = makeClient();

    const result = await client.policies.columns('s1');

    expect(result).toHaveLength(1);
    expect(result[0].source_name).toBe('Sales');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/v1/access/columns');
    expect(opts.method).toBe('GET');
  });
});
