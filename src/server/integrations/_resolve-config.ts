import type { QuerriConfig } from '../types.js';
import { ConfigError } from '../errors.js';

export interface IntegrationOptions {
  apiKey?: string;
  orgId?: string;
  host?: string;
}

/**
 * Resolves a {@link QuerriConfig} by merging explicit options with environment
 * variables. Precedence: explicit config > env vars > defaults.
 *
 * | Field   | Env Variable       | Default                       |
 * |---------|--------------------|-------------------------------|
 * | apiKey  | `QUERRI_API_KEY`   | *(required — throws if missing)* |
 * | orgId   | `QUERRI_ORG_ID`    | `undefined`                   |
 * | host    | `QUERRI_URL`      | `'https://app.querri.com'`    |
 *
 * @throws {ConfigError} If no API key is found in options or env.
 */
export function resolveConfig(options?: IntegrationOptions): QuerriConfig {
  const apiKey = options?.apiKey ?? process.env.QUERRI_API_KEY;
  if (!apiKey) {
    throw new ConfigError(
      'Missing API key. Set the QUERRI_API_KEY environment variable or pass ' +
      '{ apiKey: "qk_..." } to the handler options. ' +
      'Find your API key at https://app.querri.com/settings/api-keys.',
    );
  }

  return {
    apiKey,
    orgId: options?.orgId ?? process.env.QUERRI_ORG_ID,
    host: options?.host ?? process.env.QUERRI_URL,
  };
}
