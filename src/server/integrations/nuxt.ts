import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

export interface SessionHandlerOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (event: { body: unknown; headers: Record<string, string | undefined> }) => Promise<GetSessionParams> | GetSessionParams;
  /** Pass the h3 module if auto-import fails (e.g. in monorepos or file: linked packages). */
  h3?: { readBody: Function; getHeaders: Function; createError: Function };
}

/**
 * Creates a Nuxt server API handler for embed session creation.
 *
 * The returned function expects to receive the parsed request body as its argument.
 * Wrap it with Nuxt's `defineEventHandler` and `readBody`:
 *
 * @example
 * ```ts
 * // server/api/querri-session.post.ts
 * import { defineQuerriSessionHandler } from '@querri/embed/server/nuxt';
 *
 * const handler = defineQuerriSessionHandler();
 *
 * export default defineEventHandler(async (event) => {
 *   const body = await readBody(event);
 *   return handler(body);
 * });
 * ```
 *
 * @example With custom param resolution:
 * ```ts
 * // server/api/querri-session.post.ts
 * import { defineQuerriSessionHandler } from '@querri/embed/server/nuxt';
 *
 * const handler = defineQuerriSessionHandler({
 *   resolveParams: async ({ body, headers }) => ({
 *     user: { external_id: body.userId, email: body.email },
 *   }),
 * });
 *
 * export default defineEventHandler(async (event) => {
 *   const body = await readBody(event);
 *   const headers = getHeaders(event);
 *   return handler({ body, headers });
 * });
 * ```
 */
export function defineQuerriSessionHandler(options?: SessionHandlerOptions) {
  const client = new Querri(resolveConfig(options));

  async function handler(input: unknown): Promise<GetSessionResult> {
    if (options?.resolveParams) {
      const event = typeof input === 'object' && input !== null && 'body' in input
        ? input as { body: unknown; headers: Record<string, string | undefined> }
        : { body: input, headers: {} };
      const params = await options.resolveParams(event);
      return client.getSession(params);
    }

    return client.getSession(input as GetSessionParams);
  }

  return handler;
}

/**
 * Creates a Nuxt event handler that can be exported directly from a server route.
 *
 * This is the recommended approach — it eliminates the boilerplate of calling
 * `readBody` and wrapping with `defineEventHandler`.
 *
 * Requires `h3` (automatically available in all Nuxt server routes).
 *
 * @example
 * ```ts
 * // server/api/querri-session.post.ts
 * import { createNuxtSessionHandler } from '@querri/embed/server/nuxt';
 * export default createNuxtSessionHandler();
 * ```
 *
 * @example With custom param resolution:
 * ```ts
 * export default createNuxtSessionHandler({
 *   resolveParams: async ({ body, headers }) => ({
 *     user: { external_id: body.userId },
 *   }),
 * });
 * ```
 */
export function createNuxtSessionHandler(options?: SessionHandlerOptions) {
  const client = new Querri(resolveConfig(options));

  return async (event: unknown): Promise<GetSessionResult> => {
    // Resolve h3: prefer explicit option, then dynamic import
    let h3: any = options?.h3;
    if (!h3) {
      try {
        const h3ModuleName = 'h3';
        h3 = await import(h3ModuleName);
      } catch {
        throw new Error(
          'Could not import h3. If using a monorepo or file: link, pass ' +
          '{ h3: await import("h3") } to createNuxtSessionHandler(), or use ' +
          'defineQuerriSessionHandler() with manual readBody/getHeaders calls.',
        );
      }
    }

    try {
      const body = await h3.readBody(event);

      if (options?.resolveParams) {
        const headers = h3.getHeaders(event);
        const params = await options.resolveParams({ body, headers });
        return client.getSession(params);
      }

      return client.getSession(body as GetSessionParams);
    } catch (err) {
      if (err instanceof APIError) {
        throw h3.createError({
          statusCode: err.status,
          statusMessage: err.message,
          data: { error: err.message, code: err.code },
        });
      }
      throw err;
    }
  };
}

/**
 * Alias for {@link createNuxtSessionHandler} — provides a consistent name
 * across all framework integrations.
 *
 * @see createNuxtSessionHandler
 */
export const createSessionHandler = createNuxtSessionHandler;

/**
 * Creates a pre-configured Querri client for use in Nuxt server code.
 *
 * @example
 * ```ts
 * // server/utils/querri.ts
 * import { createQuerriClient } from '@querri/embed/server/nuxt';
 * export const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
