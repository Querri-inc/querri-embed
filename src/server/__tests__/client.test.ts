import { Querri } from '../client.js';
import { ConfigError } from '../errors.js';
import { UsersResource } from '../resources/users.js';
import { EmbedResource } from '../resources/embed.js';
import { PoliciesResource } from '../resources/policies.js';
import { ProjectsResource } from '../resources/projects.js';
import { ChatsResource } from '../resources/chats.js';
import { DashboardsResource } from '../resources/dashboards.js';
import { DataResource } from '../resources/data.js';
import { FilesResource } from '../resources/files.js';
import { SourcesResource } from '../resources/sources.js';
import { KeysResource } from '../resources/keys.js';
import { SharingResource } from '../resources/sharing.js';
import { AuditResource } from '../resources/audit.js';
import { UsageResource } from '../resources/usage.js';

describe('Querri client', () => {
  it('throws ConfigError when no API key is provided', () => {
    const originalEnv = process.env.QUERRI_API_KEY;
    delete process.env.QUERRI_API_KEY;

    try {
      expect(() => new Querri({} as { apiKey: string })).toThrow(ConfigError);
      expect(() => new Querri({} as { apiKey: string })).toThrow('API key is required');
    } finally {
      if (originalEnv !== undefined) {
        process.env.QUERRI_API_KEY = originalEnv;
      }
    }
  });

  it('falls back to QUERRI_API_KEY environment variable', () => {
    const originalEnv = process.env.QUERRI_API_KEY;
    process.env.QUERRI_API_KEY = 'qk_from_env';

    try {
      const client = new Querri({} as { apiKey: string });
      // If it did not throw, the env var was used
      expect(client).toBeInstanceOf(Querri);
    } finally {
      if (originalEnv !== undefined) {
        process.env.QUERRI_API_KEY = originalEnv;
      } else {
        delete process.env.QUERRI_API_KEY;
      }
    }
  });

  it('accepts a string as shorthand for apiKey', () => {
    const client = new Querri('qk_string_key');
    expect(client).toBeInstanceOf(Querri);
  });

  it('lazy-loads resources: accessing .users twice returns the same instance', () => {
    const client = new Querri({ apiKey: 'qk_test' });
    const first = client.users;
    const second = client.users;
    expect(first).toBe(second);
  });

  it('all resource getters return correct types', () => {
    const client = new Querri({ apiKey: 'qk_test' });

    expect(client.users).toBeInstanceOf(UsersResource);
    expect(client.embed).toBeInstanceOf(EmbedResource);
    expect(client.policies).toBeInstanceOf(PoliciesResource);
    expect(client.projects).toBeInstanceOf(ProjectsResource);
    expect(client.chats).toBeInstanceOf(ChatsResource);
    expect(client.dashboards).toBeInstanceOf(DashboardsResource);
    expect(client.data).toBeInstanceOf(DataResource);
    expect(client.files).toBeInstanceOf(FilesResource);
    expect(client.sources).toBeInstanceOf(SourcesResource);
    expect(client.keys).toBeInstanceOf(KeysResource);
    expect(client.sharing).toBeInstanceOf(SharingResource);
    expect(client.audit).toBeInstanceOf(AuditResource);
    expect(client.usage).toBeInstanceOf(UsageResource);
  });
});
