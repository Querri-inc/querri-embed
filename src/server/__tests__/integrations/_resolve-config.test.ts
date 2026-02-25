import { resolveConfig } from '../../integrations/_resolve-config.js';
import { ConfigError } from '../../errors.js';

describe('resolveConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.QUERRI_API_KEY;
    delete process.env.QUERRI_ORG_ID;
    delete process.env.QUERRI_HOST;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns config when apiKey is provided in options', () => {
    const config = resolveConfig({ apiKey: 'qk_explicit' });
    expect(config.apiKey).toBe('qk_explicit');
  });

  it('returns config when QUERRI_API_KEY env var is set', () => {
    process.env.QUERRI_API_KEY = 'qk_from_env';
    const config = resolveConfig();
    expect(config.apiKey).toBe('qk_from_env');
  });

  it('prefers explicit option over env var', () => {
    process.env.QUERRI_API_KEY = 'qk_from_env';
    const config = resolveConfig({ apiKey: 'qk_explicit' });
    expect(config.apiKey).toBe('qk_explicit');
  });

  it('throws ConfigError with setup URL when API key is missing', () => {
    expect(() => resolveConfig()).toThrow(ConfigError);
    expect(() => resolveConfig()).toThrow('app.querri.com/settings/api-keys');
  });

  it('resolves orgId from env var', () => {
    process.env.QUERRI_API_KEY = 'qk_test';
    process.env.QUERRI_ORG_ID = 'org_from_env';
    const config = resolveConfig();
    expect(config.orgId).toBe('org_from_env');
  });

  it('resolves host from env var', () => {
    process.env.QUERRI_API_KEY = 'qk_test';
    process.env.QUERRI_HOST = 'https://custom.querri.com';
    const config = resolveConfig();
    expect(config.host).toBe('https://custom.querri.com');
  });

  it('returns undefined for orgId and host when not set', () => {
    const config = resolveConfig({ apiKey: 'qk_test' });
    expect(config.orgId).toBeUndefined();
    expect(config.host).toBeUndefined();
  });
});
