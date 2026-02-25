import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

export interface SessionActionOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (args: {
    request: Request;
    params: Record<string, string | undefined>;
    context?: unknown;
  }) => Promise<GetSessionParams> | GetSessionParams;
}

/**
 * Creates a React Router v7 action handler for embed session creation.
 *
 * In React Router v7, a "resource route" exports `action` (POST) and/or
 * `loader` (GET) without a default component. The returned function matches
 * the `ActionFunctionArgs` signature so it can be exported directly as `action`.
 *
 * @example
 * ```ts
 * // app/routes/api.querri-session.ts
 * import { createSessionAction } from '@querri/embed/server/react-router';
 *
 * export const action = createSessionAction({
 *   resolveParams: async ({ request, context }) => {
 *     const user = context.user; // from your auth middleware
 *     return {
 *       user: { external_id: user.id, email: user.email },
 *     };
 *   },
 * });
 * ```
 */
export function createSessionAction(
  options?: SessionActionOptions,
): (args: {
  request: Request;
  params: Record<string, string | undefined>;
  context?: unknown;
}) => Promise<Response> {
  const client = new Querri(resolveConfig(options));

  return async (args: {
    request: Request;
    params: Record<string, string | undefined>;
    context?: unknown;
  }): Promise<Response> => {
    try {
      const params = options?.resolveParams
        ? await options.resolveParams(args)
        : ((await args.request.json()) as GetSessionParams);

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
 * Alias for {@link createSessionAction} — provides a consistent name
 * across all framework integrations.
 *
 * @see createSessionAction
 */
export const createSessionHandler = createSessionAction;

/**
 * Creates a pre-configured Querri client for use in React Router server code.
 *
 * @example
 * ```ts
 * // app/lib/querri.server.ts
 * import { createQuerriClient } from '@querri/embed/server/react-router';
 * export const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
