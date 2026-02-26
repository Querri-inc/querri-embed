import type { QuerriConfig } from '../types.js';
import {
  APIError,
  APIConnectionError,
  APITimeoutError,
  raiseForStatus,
} from '../errors.js';
import { isIdempotent, shouldRetry, calculateDelay, getRetryAfter, sleep } from './retry.js';

const VERSION = '0.1.5';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
  idempotent?: boolean;
  maxRetries?: number;
  stream?: boolean;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly orgId: string | undefined;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: QuerriConfig) {
    this.apiKey = config.apiKey;
    this.orgId = config.orgId;
    const host = (config.host ?? 'https://app.querri.com').replace(/\/+$/, '');
    this.baseUrl = host.endsWith('/api/v1') ? host : `${host}/api/v1`;
    this.timeout = config.timeout ?? 30_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const headers = this.buildHeaders(options.headers, options.body);
    const idempotent = options.idempotent ?? isIdempotent(options.method);
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const timeout = options.timeout ?? this.timeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0 && lastError) {
        const retryAfter =
          lastError instanceof APIError
            ? getRetryAfter(lastError.headers)
            : undefined;
        const delay = calculateDelay(attempt, retryAfter);
        await sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        let fetchBody: string | FormData | undefined;
        if (options.body instanceof FormData) {
          fetchBody = options.body as FormData;
        } else if (options.body !== undefined) {
          fetchBody = JSON.stringify(options.body);
        }

        const response = await this.fetchFn(url, {
          method: options.method,
          headers,
          body: fetchBody,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (options.stream && response.ok) {
          return response as unknown as T;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => null);

          if (shouldRetry(response.status, idempotent) && attempt < maxRetries) {
            lastError = new APIError(
              response.status,
              body,
              response.headers,
            );
            continue;
          }

          raiseForStatus(response.status, body, response.headers);
        }

        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (err) {
        if (err instanceof APIError) throw err;

        if ((err as Error).name === 'AbortError') {
          if (attempt < maxRetries && idempotent) {
            lastError = err as Error;
            continue;
          }
          throw new APITimeoutError(
            `Request timed out after ${timeout}ms: ${options.method} ${options.path}`,
          );
        }

        if (attempt < maxRetries && idempotent) {
          lastError = err as Error;
          continue;
        }

        throw new APIConnectionError(
          `Connection failed: ${(err as Error).message}`,
          err as Error,
        );
      }
    }

    throw lastError!;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(path, this.baseUrl + '/');
    // Fix: ensure the path is appended to the base URL correctly
    url.pathname = new URL(this.baseUrl).pathname + path;
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private buildHeaders(
    extra?: Record<string, string>,
    body?: unknown,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': `querri-node/${VERSION}`,
    };

    if (this.orgId) {
      headers['X-Tenant-ID'] = this.orgId;
    }

    // Only set Content-Type for JSON bodies (not FormData)
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (extra) {
      Object.assign(headers, extra);
    }

    return headers;
  }
}
