/**
 * Querri SDK error classes.
 *
 * Hierarchy:
 *   QuerriError
 *   ├── ConfigError
 *   ├── APIConnectionError
 *   │   └── APITimeoutError
 *   ├── APIError
 *   │   ├── AuthenticationError   (401)
 *   │   ├── PermissionError       (403)
 *   │   ├── NotFoundError         (404)
 *   │   ├── ValidationError       (400, 422)
 *   │   ├── ConflictError         (409)
 *   │   ├── RateLimitError        (429)
 *   │   └── ServerError           (500+)
 *   └── StreamError
 *       ├── StreamTimeoutError
 *       └── StreamCancelledError
 */

export class QuerriError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'QuerriError';
  }
}

export class ConfigError extends QuerriError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class APIConnectionError extends QuerriError {
  constructor(message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = 'APIConnectionError';
  }
}

export class APITimeoutError extends APIConnectionError {
  constructor(message: string) {
    super(message);
    this.name = 'APITimeoutError';
  }
}

/**
 * Error codes the Querri `/v1` API sends in `error.code`.
 *
 * Status-based classes stay the primary way to branch (`PermissionError`,
 * `NotFoundError`, …); the code tells you *which* 403 or 404 it was.
 * The server may add codes over time, so treat `APIError.code` as a plain
 * string and use these constants for comparison, not exhaustiveness.
 */
export const ERROR_CODES = {
  // Authentication (401) and tenant resolution
  MISSING_API_KEY: 'missing_api_key',
  INVALID_API_KEY: 'invalid_api_key',
  MISSING_TENANT_ID: 'missing_tenant_id',
  INVALID_JWT: 'invalid_jwt',
  INVALID_EMBED_SESSION: 'invalid_embed_session',
  IP_NOT_ALLOWED: 'ip_not_allowed',
  ORG_SCHEDULED_FOR_DELETION: 'org_scheduled_for_deletion',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  // Permissions (403)
  INSUFFICIENT_SCOPE: 'insufficient_scope',
  PERMISSION_DENIED: 'permission_denied',
  // Custom Roles on embed sessions
  ROLE_NOT_FOUND: 'role_not_found',
  ROLE_NOT_ALLOWED: 'role_not_allowed',
  ROLE_DISABLED: 'role_disabled',
  SEAT_CHANGE_REQUIRED: 'seat_change_required',
  // Embed sessions
  NOT_ORG_MEMBER: 'not_org_member',
  USER_NOT_FOUND: 'user_not_found',
  ORIGIN_REQUIRED: 'origin_required',
  ORIGIN_NOT_ALLOWED: 'origin_not_allowed',
  SESSION_NOT_FOUND: 'session_not_found',
  ORG_MISMATCH: 'org_mismatch',
  SESSION_CREATION_FAILED: 'session_creation_failed',
  REFRESH_FAILED: 'refresh_failed',
  MEMBERSHIP_CHECK_FAILED: 'membership_check_failed',
} as const;

/** A documented `/v1` error code (see {@link ERROR_CODES}). */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Normalize a `/v1` error body to the `{ error: {...} }` / flat shape
 * `APIError` reads.
 *
 * FastAPI wraps every `HTTPException` detail in `{"detail": ...}`, so the
 * real wire shapes are:
 *   - `{"detail": {"error": {type, code, message, doc_url, …}}}` → `detail`
 *   - `{"detail": {type, code, message, …}}`                     → `detail`
 *   - `{"detail": [{loc, msg, type}, …]}` (Pydantic 422)          → a
 *     synthesized `{error: {type: 'validation_error', message}}`
 *   - `{"detail": "text"}`                                       → `{message}`
 * Anything else (already-flat `{error: …}` bodies, `null`, non-objects) is
 * returned unchanged.
 */
export function unwrapDetail(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const b = body as Record<string, unknown>;
  if (!('detail' in b)) return body;
  const detail = b.detail;

  if (typeof detail === 'string') return { message: detail };

  if (Array.isArray(detail)) {
    const parts = detail
      .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.map(String).join('.') : '';
        const msg = typeof d.msg === 'string' ? d.msg : 'invalid';
        return loc ? `${loc}: ${msg}` : msg;
      });
    return {
      error: {
        type: 'validation_error',
        message: parts.length
          ? `Validation failed: ${parts.join('; ')}`
          : 'Validation failed',
      },
    };
  }

  if (detail && typeof detail === 'object') return detail;
  return body;
}

export class APIError extends QuerriError {
  readonly status: number;
  readonly type: string | undefined;
  readonly code: string | undefined;
  readonly docUrl: string | undefined;
  readonly requestId: string | undefined;
  /**
   * The permission key a `permission_denied` refusal names (e.g.
   * `'dashboards.list.view'`). Read from `error.permission`, else from the
   * `X-Permission-Denied` response header.
   */
  readonly permission: string | undefined;
  /**
   * Why a permission was refused: `role_denied`, `not_in_plan`, `flag_off`,
   * `embed_disabled`, `dependency_unmet` or `forbidden`.
   */
  readonly reason: string | undefined;
  /** The response body exactly as the server sent it (not unwrapped). */
  readonly body: unknown;
  readonly headers: Headers;

  constructor(
    status: number,
    body: unknown,
    headers: Headers,
    requestId?: string,
  ) {
    const normalized = unwrapDetail(body);
    const message = APIError.makeMessage(status, normalized);
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.body = body;
    this.headers = headers;
    this.requestId = requestId ?? headers.get('x-request-id') ?? undefined;

    let permission: string | undefined;
    if (normalized && typeof normalized === 'object') {
      const b = normalized as Record<string, unknown>;
      // Support both flat and Stripe-style nested error: { error: { type, code, message } }
      const errObj =
        b.error && typeof b.error === 'object'
          ? (b.error as Record<string, unknown>)
          : b;
      this.type = typeof errObj.type === 'string' ? errObj.type : undefined;
      this.code = typeof errObj.code === 'string' ? errObj.code : undefined;
      this.docUrl =
        typeof errObj.doc_url === 'string' ? errObj.doc_url : undefined;
      this.reason = typeof errObj.reason === 'string' ? errObj.reason : undefined;
      permission =
        typeof errObj.permission === 'string' ? errObj.permission : undefined;
      if (!this.requestId && typeof errObj.request_id === 'string') {
        this.requestId = errObj.request_id;
      }
    }
    this.permission = permission ?? headers.get('x-permission-denied') ?? undefined;
  }

  private static makeMessage(status: number, body: unknown): string {
    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      if (typeof b.error === 'string') return b.error;
      if (typeof b.message === 'string') return b.message;
      if (b.error && typeof b.error === 'object') {
        const e = b.error as Record<string, unknown>;
        if (typeof e.message === 'string') return e.message;
      }
    }
    return `Request failed with status ${status}`;
  }
}

export class AuthenticationError extends APIError {
  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(401, body, headers, requestId);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends APIError {
  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(403, body, headers, requestId);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends APIError {
  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(404, body, headers, requestId);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends APIError {
  constructor(body: unknown, headers: Headers, requestId?: string, status = 400) {
    super(status, body, headers, requestId);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends APIError {
  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(409, body, headers, requestId);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends APIError {
  readonly retryAfter: number | undefined;

  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(429, body, headers, requestId);
    this.name = 'RateLimitError';
    const ra = headers.get('retry-after');
    this.retryAfter = ra ? parseFloat(ra) : undefined;
  }
}

export class ServerError extends APIError {
  constructor(status: number, body: unknown, headers: Headers, requestId?: string) {
    super(status, body, headers, requestId);
    this.name = 'ServerError';
  }
}

export class StreamError extends QuerriError {
  constructor(message: string) {
    super(message);
    this.name = 'StreamError';
  }
}

export class StreamTimeoutError extends StreamError {
  constructor(message: string) {
    super(message);
    this.name = 'StreamTimeoutError';
  }
}

export class StreamCancelledError extends StreamError {
  constructor(message: string) {
    super(message);
    this.name = 'StreamCancelledError';
  }
}

export function throwForStatus(
  status: number,
  body: unknown,
  headers: Headers,
): void {
  if (status < 400) return;
  const requestId = headers.get('x-request-id') ?? undefined;
  switch (status) {
    case 400: throw new ValidationError(body, headers, requestId);
    case 401: throw new AuthenticationError(body, headers, requestId);
    case 403: throw new PermissionError(body, headers, requestId);
    case 404: throw new NotFoundError(body, headers, requestId);
    case 422: throw new ValidationError(body, headers, requestId, 422);
    case 409: throw new ConflictError(body, headers, requestId);
    case 429: throw new RateLimitError(body, headers, requestId);
    default:
      if (status >= 500) throw new ServerError(status, body, headers, requestId);
      throw new APIError(status, body, headers, requestId);
  }
}
