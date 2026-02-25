import { shouldRetry, calculateDelay } from '../../http/retry.js';

describe('shouldRetry', () => {
  it('always retries 429 regardless of idempotency', () => {
    expect(shouldRetry(429, true)).toBe(true);
    expect(shouldRetry(429, false)).toBe(true);
  });

  it('retries 500, 502, 503, 504 for idempotent requests', () => {
    expect(shouldRetry(500, true)).toBe(true);
    expect(shouldRetry(502, true)).toBe(true);
    expect(shouldRetry(503, true)).toBe(true);
    expect(shouldRetry(504, true)).toBe(true);
  });

  it('does not retry 5xx for non-idempotent requests', () => {
    expect(shouldRetry(500, false)).toBe(false);
    expect(shouldRetry(502, false)).toBe(false);
    expect(shouldRetry(503, false)).toBe(false);
    expect(shouldRetry(504, false)).toBe(false);
  });

  it('does not retry 400, 401, 403, 404', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(shouldRetry(status, true)).toBe(false);
      expect(shouldRetry(status, false)).toBe(false);
    }
  });
});

describe('calculateDelay', () => {
  it('produces exponential backoff', () => {
    // Attempt 1: base = 500 * 2^0 = 500, jitter up to +/- 25%
    // Attempt 2: base = 500 * 2^1 = 1000
    // Attempt 3: base = 500 * 2^2 = 2000
    const delays: number[] = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      // Run many times to average out jitter
      let sum = 0;
      const iterations = 200;
      for (let i = 0; i < iterations; i++) {
        sum += calculateDelay(attempt);
      }
      delays.push(sum / iterations);
    }

    // Each successive delay should roughly double (within jitter tolerance)
    for (let i = 1; i < delays.length; i++) {
      // Allow generous tolerance due to jitter, but ratio should be ~2
      const ratio = delays[i] / delays[i - 1];
      expect(ratio).toBeGreaterThan(1.3);
      expect(ratio).toBeLessThan(3.0);
    }
  });

  it('caps delay at 30 seconds', () => {
    // At attempt 20, base = 500 * 2^19 which vastly exceeds 30s
    for (let i = 0; i < 50; i++) {
      const delay = calculateDelay(20);
      expect(delay).toBeLessThanOrEqual(30_000);
    }
  });

  it('applies jitter within +/- 25% of exponential base', () => {
    const attempt = 3;
    const base = 500 * Math.pow(2, attempt - 1); // 2000
    const min = base - base * 0.25;
    const max = base + base * 0.25;

    for (let i = 0; i < 200; i++) {
      const delay = calculateDelay(attempt);
      expect(delay).toBeGreaterThanOrEqual(min);
      expect(delay).toBeLessThanOrEqual(max);
    }
  });

  it('respects retryAfter when larger than computed delay', () => {
    // retryAfter is in seconds, so 60s = 60_000ms which caps at 30_000
    const delay = calculateDelay(1, 10); // 10s retryAfter > ~500ms base
    expect(delay).toBeGreaterThanOrEqual(10_000);
    expect(delay).toBeLessThanOrEqual(30_000);
  });
});
