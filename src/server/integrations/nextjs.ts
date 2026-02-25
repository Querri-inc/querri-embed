import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

export interface SessionHandlerOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (req: Request) => Promise<GetSessionParams> | GetSessionParams;
}

/**
 * Creates a Next.js App Router route handler for embed session creation.
 *
 * @example
 * ```ts
 * // app/api/querri-session/route.ts
 * import { createSessionHandler } from '@querri/embed/server/nextjs';
 *
 * export const POST = createSessionHandler({
 *   resolveParams: async (req) => {
 *     const session = await getServerSession(); // your auth
 *     return {
 *       user: { external_id: session.user.id, email: session.user.email },
 *     };
 *   },
 * });
 * ```
 */
export function createSessionHandler(
  options?: SessionHandlerOptions,
): (req: Request) => Promise<Response> {
  const client = new Querri(resolveConfig(options));

  return async (req: Request): Promise<Response> => {
    try {
      const params = options?.resolveParams
        ? await options.resolveParams(req)
        : ((await req.json()) as GetSessionParams);

      const session = await client.getSession(params);
      return Response.json(session);
    } catch (err) {
      if (err instanceof APIError) {
        return Response.json(
          { error: err.message, code: err.code },
          { status: err.status },
        );
      }
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

/**
 * Creates a pre-configured Querri client for use in Next.js server components and actions.
 *
 * @example
 * ```ts
 * // lib/querri.ts
 * import { createQuerriClient } from '@querri/embed/server/nextjs';
 * export const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
