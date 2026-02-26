import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

export interface SessionHandlerOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (event: { request: Request; locals?: unknown; url?: URL }) => Promise<GetSessionParams> | GetSessionParams;
}

/**
 * Creates a SvelteKit request handler for embed session creation.
 *
 * @example
 * ```ts
 * // src/routes/api/querri-session/+server.ts
 * import { createSessionHandler } from '@querri-inc/embed/server/sveltekit';
 *
 * export const POST = createSessionHandler({
 *   resolveParams: async ({ locals }) => ({
 *     user: { external_id: locals.user.id, email: locals.user.email },
 *   }),
 * });
 * ```
 */
export function createSessionHandler(options?: SessionHandlerOptions) {
  const client = new Querri(resolveConfig(options));

  return async (event: { request: Request; locals?: unknown; url?: URL }): Promise<Response> => {
    try {
      const params = options?.resolveParams
        ? await options.resolveParams(event)
        : ((await event.request.json()) as GetSessionParams);

      const session = await client.getSession(params);
      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return new Response(
          JSON.stringify({ error: err.message, code: err.code }),
          { status: err.status, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  };
}

/**
 * Creates a pre-configured Querri client for use in SvelteKit server code.
 *
 * @example
 * ```ts
 * // src/lib/server/querri.ts
 * import { createQuerriClient } from '@querri-inc/embed/server/sveltekit';
 * export const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
