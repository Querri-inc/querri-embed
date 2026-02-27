import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

export interface QuerriMiddlewareOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (req: { body: unknown; headers: Record<string, string | undefined> }) => Promise<GetSessionParams> | GetSessionParams;
}

/**
 * Creates Express-compatible middleware for embed session creation.
 *
 * Works with Angular SSR (Express-based), standalone Express servers,
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

      const session = await client.getSession(params);
      res.json(session);
    } catch (err) {
      if (err instanceof APIError) {
        res.status(err.status).json({ error: err.message, code: err.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

/**
 * Alias for {@link createSessionHandler} — the original Express/Angular-specific
 * name. Kept for backward compatibility.
 *
 * @see createSessionHandler
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
