import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams } from '../types.js';
import { resolveConfig, sessionErrorBody } from './_resolve-config.js';

export type { SessionErrorBody } from './_resolve-config.js';

export interface SessionHandlerOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  /**
   * Build the `getSession()` params from your own auth. Decide `role`
   * (Custom Roles) here on the server — never read it from the request body
   * or query: the browser SDK's `sessionEndpoint` mode POSTs with no body on
   * purpose, and a role taken from the page lets any visitor pick their own
   * permissions.
   */
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
  let client: Querri | undefined;

  return async (event: { request: Request; locals?: unknown; url?: URL }): Promise<Response> => {
    try {
      if (!client) client = new Querri(resolveConfig(options));
      const params = options?.resolveParams
        ? await options.resolveParams(event)
        : { user: 'embed_anonymous' } as GetSessionParams;

      // Auto-extract origin from request if not explicitly set
      if (!params.origin) {
        params.origin = event.request.headers.get('origin') ?? undefined;
      }

      const session = await client.getSession(params);
      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return new Response(
          JSON.stringify(sessionErrorBody(err)),
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
