import { createHash } from 'node:crypto';
import { getSession } from '../get-session.js';

function makeMockClient() {
  return {
    users: {
      getOrCreate: vi.fn().mockResolvedValue({
        id: 'u_resolved',
        external_id: 'ext_1',
      }),
    },
    policies: {
      list: vi.fn().mockResolvedValue({ data: [], hasMore: false, nextCursor: null }),
      create: vi.fn().mockResolvedValue({
        id: 'pol_new',
        name: 'sdk_auto_test',
        description: null,
        source_ids: [],
        row_filters: [],
        user_count: 0,
        created_at: null,
        updated_at: null,
      }),
      replaceUserPolicies: vi.fn().mockResolvedValue({
        user_id: 'u_resolved',
        policy_ids: ['pol_new'],
        added: ['pol_new'],
        removed: [],
      }),
    },
    embed: {
      createSession: vi.fn().mockResolvedValue({
        session_token: 'tok_session',
        expires_in: 3600,
        user_id: 'u_resolved',
      }),
    },
  };
}

describe('getSession', () => {
  it('string user calls getOrCreate with external_id', async () => {
    const client = makeMockClient();

    const result = await getSession(client, { user: 'my_user_123' });

    expect(client.users.getOrCreate).toHaveBeenCalledWith('my_user_123');
    expect(result.user_id).toBe('u_resolved');
    expect(result.external_id).toBe('ext_1');
    expect(result.session_token).toBe('tok_session');
  });

  it('object user calls getOrCreate with params', async () => {
    const client = makeMockClient();

    await getSession(client, {
      user: { external_id: 'ext_2', email: 'test@example.com', first_name: 'Test' },
    });

    expect(client.users.getOrCreate).toHaveBeenCalledWith('ext_2', {
      email: 'test@example.com',
      first_name: 'Test',
    });
  });

  it('policy_ids access replaces user policies atomically', async () => {
    const client = makeMockClient();

    await getSession(client, {
      user: 'ext_1',
      access: { policy_ids: ['pol_a', 'pol_b'] },
    });

    expect(client.policies.replaceUserPolicies).toHaveBeenCalledTimes(1);
    expect(client.policies.replaceUserPolicies).toHaveBeenCalledWith('u_resolved', {
      policy_ids: ['pol_a', 'pol_b'],
    });
  });

  it('inline access computes hash and creates policy with sdk_auto_ prefix', async () => {
    const client = makeMockClient();

    await getSession(client, {
      user: 'ext_1',
      access: {
        sources: ['src_1'],
        filters: { region: 'US' },
      },
    });

    // Should have tried to find existing policy
    expect(client.policies.list).toHaveBeenCalledTimes(1);
    const listCallArgs = client.policies.list.mock.calls[0][0];
    expect(listCallArgs.name).toMatch(/^sdk_auto_/);

    // Should have created a new policy since list returned empty
    expect(client.policies.create).toHaveBeenCalledTimes(1);
    const createArgs = client.policies.create.mock.calls[0][0];
    expect(createArgs.name).toMatch(/^sdk_auto_/);
    expect(createArgs.source_ids).toEqual(['src_1']);
    expect(createArgs.row_filters).toEqual([{ column: 'region', values: ['US'] }]);

    // Should have replaced user policies
    expect(client.policies.replaceUserPolicies).toHaveBeenCalledTimes(1);
  });

  it('inline access reuses existing policy and does not create a new one', async () => {
    const client = makeMockClient();

    // Compute the expected hash so we can set the right policy name
    const access = { sources: ['src_1'], filters: { region: 'US' } };
    const normalized = {
      sources: [...access.sources].sort(),
      filters: { region: ['US'] },
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .slice(0, 8);
    const policyName = `sdk_auto_${hash}`;

    const existingPolicy = {
      id: 'pol_existing',
      name: policyName,
      description: null,
      source_ids: ['src_1'],
      row_filters: [{ column: 'region', values: ['US'] }],
      user_count: 1,
      created_at: null,
      updated_at: null,
    };

    client.policies.list.mockResolvedValue({ data: [existingPolicy], hasMore: false, nextCursor: null });

    await getSession(client, {
      user: 'ext_1',
      access,
    });

    // Should NOT create a new policy
    expect(client.policies.create).not.toHaveBeenCalled();

    // Should replace user policies with the existing policy
    expect(client.policies.replaceUserPolicies).toHaveBeenCalledWith('u_resolved', {
      policy_ids: ['pol_existing'],
    });
  });

  it('creates embed session with correct user_id, ttl, origin', async () => {
    const client = makeMockClient();

    await getSession(client, {
      user: 'ext_1',
      origin: 'https://myapp.com',
      ttl: 7200,
    });

    expect(client.embed.createSession).toHaveBeenCalledWith({
      user_id: 'u_resolved',
      origin: 'https://myapp.com',
      ttl: 7200,
    });
  });

  it('defaults ttl to 3600 when not specified', async () => {
    const client = makeMockClient();

    await getSession(client, { user: 'ext_1' });

    expect(client.embed.createSession).toHaveBeenCalledWith({
      user_id: 'u_resolved',
      origin: undefined,
      ttl: 3600,
    });
  });
});
