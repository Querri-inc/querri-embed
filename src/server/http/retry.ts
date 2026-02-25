import type { RateLimitError } from '../errors.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']);

export function isIdempotent(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase());
}

export function shouldRetry(statusCode: number, idempotent: boolean): boolean {
  if (statusCode === 429) return true;
  if ([500, 502, 503, 504].includes(statusCode) && idempotent) return true;
  return false;
}

export function calculateDelay(attempt: number, retryAfter?: number): number {
  const base = 500;
  const exponential = base * Math.pow(2, attempt - 1);
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  let delay = exponential + jitter;

  if (retryAfter !== undefined && retryAfter > 0) {
    delay = Math.max(delay, retryAfter * 1000);
  }

  return Math.min(delay, 30_000);
}

export function getRetryAfter(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
