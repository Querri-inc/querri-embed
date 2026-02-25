import { createHash } from 'node:crypto';
import type {
  GetSessionParams,
  GetSessionResult,
  GetSessionInlineAccess,
  Policy,
  RowFilter,
} from './types.js';

/**
 * Internal type for the client facade needed by getSession.
 * Avoids circular import with client.ts.
 */
interface QuerriLike {
  users: {
    getOrCreate(
      externalId: string,
      params?: { email?: string; first_name?: string; last_name?: string; role?: string },
    ): Promise<{ id: string; external_id: string | null }>;
  };
  policies: {
    list(params?: { name?: string }): Promise<Policy[]>;
    create(params: {
      name: string;
      description?: string;
      source_ids?: string[];
      row_filters?: RowFilter[];
    }): Promise<Policy>;
    assignUsers(
      policyId: string,
      params: { user_ids: string[] },
    ): Promise<unknown>;
  };
  embed: {
    createSession(params: {
      user_id: string;
      origin?: string;
      ttl?: number;
    }): Promise<{ session_token: string; expires_in: number; user_id: string | null }>;
  };
}

/**
 * High-level convenience that creates an embed session in three steps:
 *
 * 1. **User resolution** — calls `users.getOrCreate()` with the external ID.
 *    The `user` param accepts a string shorthand (`'ext_123'`) or a full object.
 * 2. **Access policy** — if `access` contains inline `sources` + `filters`, the
 *    SDK auto-creates (or reuses) a deterministically-named policy and assigns
 *    the user to it. If `policy_ids` are provided, those are used directly.
 * 3. **Session creation** — calls `embed.createSession()` and returns the token.
 */
export async function getSession(
  client: QuerriLike,
  params: GetSessionParams,
): Promise<GetSessionResult> {
  // --- Step 1: User Resolution ---
  let userId: string;
  let externalId: string | null;

  if (typeof params.user === 'string') {
    const user = await client.users.getOrCreate(params.user);
    userId = user.id;
    externalId = user.external_id;
  } else {
    const { external_id, ...rest } = params.user;
    const user = await client.users.getOrCreate(external_id, rest);
    userId = user.id;
    externalId = user.external_id;
  }

  // --- Step 2: Access Policy ---
  if (params.access) {
    let policyIds: string[];

    if ('policy_ids' in params.access) {
      policyIds = params.access.policy_ids;
    } else {
      const inlineAccess = params.access as GetSessionInlineAccess;
      const hash = hashAccessSpec(inlineAccess);
      const policyName = `sdk_auto_${hash}`;

      let existing = await findPolicyByName(client, policyName);

      if (!existing) {
        existing = await client.policies.create({
          name: policyName,
          source_ids: inlineAccess.sources,
          row_filters: buildRowFilters(inlineAccess.filters),
        });
      }

      policyIds = [existing.id];
    }

    for (const policyId of policyIds) {
      await client.policies.assignUsers(policyId, { user_ids: [userId] });
    }
  }

  // --- Step 3: Create Embed Session ---
  const session = await client.embed.createSession({
    user_id: userId,
    origin: params.origin,
    ttl: params.ttl ?? 3600,
  });

  return {
    session_token: session.session_token,
    expires_in: session.expires_in,
    user_id: userId,
    external_id: externalId,
  };
}

function hashAccessSpec(access: GetSessionInlineAccess): string {
  const normalized = {
    sources: [...access.sources].sort(),
    filters: Object.keys(access.filters)
      .sort()
      .reduce(
        (acc, key) => {
          const val = access.filters[key];
          acc[key] = Array.isArray(val) ? [...val].sort() : [val];
          return acc;
        },
        {} as Record<string, string[]>,
      ),
  };

  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex').slice(0, 8);
}

function buildRowFilters(
  filters: Record<string, string | string[]>,
): RowFilter[] {
  return Object.entries(filters).map(([column, value]) => ({
    column,
    values: Array.isArray(value) ? value : [value],
  }));
}

async function findPolicyByName(
  client: QuerriLike,
  name: string,
): Promise<Policy | null> {
  const policies = await client.policies.list({ name });
  return policies.find((p) => p.name === name) ?? null;
}
