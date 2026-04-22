import { Querri } from '../client.js';
import { APIError } from '../errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from '../types.js';
import { resolveConfig } from './_resolve-config.js';

/**
 * Minimal structural type for the `h3` module's runtime surface used here.
 * Typed as a local interface so consumers need not depend on h3's types at
 * compile time (h3 is a Nuxt-managed runtime dependency).
 */
interface H3Module {
  readBody: (event: unknown) => Promise<unknown>;
  getHeaders: (event: unknown) => Record<string, string | undefined>;
  createError: (params: {
    statusCode?: number;
    statusMessage?: string;
    data?: unknown;
  }) => Error;
}

export interface SessionHandlerOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
  resolveParams?: (event: { body: unknown; headers: Record<string, string | undefined> }) => Promise<GetSessionParams> | GetSessionParams;
  /** Pass the h3 module if auto-import fails (e.g. in monorepos or file: linked packages). */
  h3?: H3Module;
}

type HandlerInput = { body: unknown; headers: Record<string, string | undefined> };

async function resolveSessionFor(
  client: Querri,
  input: HandlerInput,
  options: SessionHandlerOptions | undefined,
): Promise<GetSessionResult> {
  const params = options?.resolveParams
    ? await options.resolveParams(input)
    : ({ user: 'embed_anonymous' } as GetSessionParams);
  if (!params.origin) {
    params.origin = input.headers?.['origin'] ?? undefined;
  }
  return client.getSession(params);
}

/**
 * Creates a Nuxt server API handler for embed session creation.
 *
 * The returned function expects to receive the parsed request body as its argument.
 * Wrap it with Nuxt's `defineEventHandler` and `readBody`:
 *
 * h3's `defineEventHandler` auto-serializes the returned object as JSON.
 *
 * @example
 * ```ts
 * // server/api/querri-session.post.ts
 * import { defineQuerriSessionHandler } from '@querri-inc/embed/server/nuxt';
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
 * import { defineQuerriSessionHandler } from '@querri-inc/embed/server/nuxt';
 *
 * const handler = defineQuerriSessionHandler({
 *   resolveParams: async ({ body, headers }) => {
 *     const user = await getUserFromAuth(headers.authorization);
 *     return { user: { external_id: user.id, email: user.email } };
 *   },
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
  let client: Querri | undefined;

  return async (input: unknown): Promise<GetSessionResult> => {
    if (!client) client = new Querri(resolveConfig(options));
    const event: HandlerInput =
      typeof input === 'object' && input !== null && 'body' in input
        ? (input as HandlerInput)
        : { body: input, headers: {} };
    return resolveSessionFor(client, event, options);
  };
}

/**
 * Creates a Nuxt event handler that can be exported directly from a server route.
 *
 * This is the recommended approach — it eliminates the boilerplate of calling
 * `readBody` and wrapping with `defineEventHandler`.
 *
 * Requires `h3` (automatically available in all Nuxt server routes).
 * The returned handler returns a plain object; h3 auto-serializes it as JSON.
 *
 * @example
 * ```ts
 * // server/api/querri-session.post.ts
 * import { createSessionHandler } from '@querri-inc/embed/server/nuxt';
 * export default createSessionHandler();
 * ```
 *
 * @example With custom param resolution:
 * ```ts
 * export default createSessionHandler({
 *   resolveParams: async ({ body, headers }) => {
 *     const user = await getUserFromAuth(headers.authorization);
 *     return { user: { external_id: user.id, email: user.email } };
 *   },
 * });
 * ```
 */
export function createSessionHandler(options?: SessionHandlerOptions) {
  let client: Querri | undefined;

  return async (event: unknown): Promise<GetSessionResult> => {
    let h3: H3Module | undefined = options?.h3;
    if (!h3) {
      try {
        const h3ModuleName = 'h3';
        h3 = (await import(h3ModuleName)) as H3Module;
      } catch {
        throw new Error(
          'Could not import h3. If using a monorepo or file: link, pass ' +
          '{ h3: await import("h3") } to createSessionHandler(), or use ' +
          'defineQuerriSessionHandler() with manual readBody/getHeaders calls.',
        );
      }
    }

    try {
      if (!client) client = new Querri(resolveConfig(options));
      const body = await h3.readBody(event);
      const headers = h3.getHeaders(event);
      return await resolveSessionFor(client, { body, headers }, options);
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
 * Alias for {@link createSessionHandler} — the original Nuxt-specific name.
 * Kept for backward compatibility.
 *
 * @see createSessionHandler
 */
export const createNuxtSessionHandler = createSessionHandler;

/**
 * Creates a pre-configured Querri client for use in Nuxt server code.
 *
 * @example
 * ```ts
 * // server/utils/querri.ts
 * import { createQuerriClient } from '@querri-inc/embed/server/nuxt';
 * export const querri = createQuerriClient();
 * ```
 */
export function createQuerriClient(options?: Partial<QuerriConfig>): Querri {
  return new Querri({
    ...resolveConfig(options),
    ...options,
  });
}
