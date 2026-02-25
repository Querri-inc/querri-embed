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
 *   │   ├── ValidationError       (400)
 *   │   ├── ConflictError         (409)
 *   │   ├── RateLimitError        (429)
 *   │   └── ServerError           (500+)
 *   └── StreamError
 *       ├── StreamTimeoutError
 *       └── StreamCancelledError
 */

export class QuerriError extends Error {
  constructor(message: string) {
    super(message);
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
  readonly cause: Error | undefined;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'APIConnectionError';
    this.cause = cause;
  }
}

export class APITimeoutError extends APIConnectionError {
  constructor(message: string) {
    super(message);
    this.name = 'APITimeoutError';
  }
}

export class APIError extends QuerriError {
  readonly status: number;
  readonly type: string | undefined;
  readonly code: string | undefined;
  readonly docUrl: string | undefined;
  readonly requestId: string | undefined;
  readonly body: unknown;
  readonly headers: Headers;

  constructor(
    status: number,
    body: unknown,
    headers: Headers,
    requestId?: string,
  ) {
    const message = APIError.makeMessage(status, body);
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.body = body;
    this.headers = headers;
    this.requestId = requestId ?? headers.get('x-request-id') ?? undefined;

    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      this.type = typeof b.type === 'string' ? b.type : undefined;
      this.code = typeof b.code === 'string' ? b.code : undefined;
      this.docUrl = typeof b.doc_url === 'string' ? b.doc_url : undefined;
    }
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
  constructor(body: unknown, headers: Headers, requestId?: string) {
    super(400, body, headers, requestId);
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

export function raiseForStatus(
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
    case 409: throw new ConflictError(body, headers, requestId);
    case 429: throw new RateLimitError(body, headers, requestId);
    default:
      if (status >= 500) throw new ServerError(status, body, headers, requestId);
      throw new APIError(status, body, headers, requestId);
  }
}
