import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams } from '../types.js';
import { resolveConfig, sessionErrorBody } from './_resolve-config.js';

export interface QuerriMiddlewareOptions {
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
  resolveParams?: (req: { body: unknown; headers: Record<string, string | undefined> }) => Promise<GetSessionParams> | GetSessionParams;
}

/**
 * Creates Express-compatible middleware for embed session creation.
 *
 * Works with standalone Express servers, Angular SSR (which is Express-based),
 * or any Node.js framework that uses Express-style `(req, res)` handlers.
 *
 * @example
 * ```ts
 * // server.ts
 * import express from 'express';
 * import { createSessionHandler } from '@querri-inc/embed/server/express';
 *
 * const app = express();
 * app.use(express.json());
 *
 * app.post('/api/querri-session', createSessionHandler({
 *   resolveParams: async (req) => {
 *     const user = await getUserFromAuth(req.headers.authorization);
 *     return { user: { external_id: user.id, email: user.email } };
 *   },
 * }));
 * ```
 */
export function createSessionHandler(options?: QuerriMiddlewareOptions) {
  let client: Querri | undefined;

  return async (
    req: { body: unknown; headers: Record<string, string | undefined> },
    res: { status(code: number): { json(body: unknown): void }; json(body: unknown): void },
  ): Promise<void> => {
    try {
      if (!client) client = new Querri(resolveConfig(options));
      const params = options?.resolveParams
        ? await options.resolveParams(req)
        : { user: 'embed_anonymous' } as GetSessionParams;

      if (!params.origin) {
        params.origin = req.headers['origin'] ?? undefined;
      }

      const session = await client.getSession(params);
      res.json(session);
    } catch (err) {
      if (err instanceof APIError) {
        res.status(err.status).json(sessionErrorBody(err));
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

/**
 * @deprecated Use {@link createSessionHandler} instead. Kept for backward compatibility.
 */
export const createQuerriMiddleware = createSessionHandler;

/**
 * Creates a pre-configured Querri client for use in Express/Angular server-side code.
 *
 * @example
 * ```ts
 * import { createQuerriClient } from '@querri-inc/embed/server/express';
 * const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
