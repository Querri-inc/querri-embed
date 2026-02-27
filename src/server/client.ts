import { HttpClient } from './http/base-client.js';
import { ConfigError } from './errors.js';
import type { QuerriConfig, GetSessionParams, GetSessionResult } from './types.js';
import { getSession } from './get-session.js';

import { UsersResource } from './resources/users.js';
import { EmbedResource } from './resources/embed.js';
import { PoliciesResource } from './resources/policies.js';
import { ProjectsResource } from './resources/projects.js';
import { ChatsResource } from './resources/chats.js';
import { DashboardsResource } from './resources/dashboards.js';
import { DataResource } from './resources/data.js';
import { FilesResource } from './resources/files.js';
import { SourcesResource } from './resources/sources.js';
import { KeysResource } from './resources/keys.js';
import { SharingResource } from './resources/sharing.js';
import { AuditResource } from './resources/audit.js';
import { UsageResource } from './resources/usage.js';

export class Querri {
  private readonly _httpClient: HttpClient;

  private _users?: UsersResource;
  private _embed?: EmbedResource;
  private _policies?: PoliciesResource;
  private _projects?: ProjectsResource;
  private _chats?: ChatsResource;
  private _dashboards?: DashboardsResource;
  private _data?: DataResource;
  private _files?: FilesResource;
  private _sources?: SourcesResource;
  private _keys?: KeysResource;
  private _sharing?: SharingResource;
  private _audit?: AuditResource;
  private _usage?: UsageResource;

  constructor(config: QuerriConfig | string) {
    const resolved: QuerriConfig =
      typeof config === 'string' ? { apiKey: config } : config;

    const apiKey = resolved.apiKey ?? process.env.QUERRI_API_KEY;
    if (!apiKey) {
      throw new ConfigError(
        'API key is required. Pass it in the config or set the QUERRI_API_KEY environment variable.',
      );
    }

    const orgId = resolved.orgId ?? process.env.QUERRI_ORG_ID;
    const host = resolved.host ?? process.env.QUERRI_URL ?? 'https://app.querri.com';

    this._httpClient = new HttpClient({
      ...resolved,
      apiKey,
      orgId,
      host,
    });
  }

  get users(): UsersResource {
    return (this._users ??= new UsersResource(this._httpClient));
  }

  get embed(): EmbedResource {
    return (this._embed ??= new EmbedResource(this._httpClient));
  }

  get policies(): PoliciesResource {
    return (this._policies ??= new PoliciesResource(this._httpClient));
  }

  get projects(): ProjectsResource {
    return (this._projects ??= new ProjectsResource(this._httpClient));
  }

  get chats(): ChatsResource {
    return (this._chats ??= new ChatsResource(this._httpClient));
  }

  get dashboards(): DashboardsResource {
    return (this._dashboards ??= new DashboardsResource(this._httpClient));
  }

  get data(): DataResource {
    return (this._data ??= new DataResource(this._httpClient));
  }

  get files(): FilesResource {
    return (this._files ??= new FilesResource(this._httpClient));
  }

  get sources(): SourcesResource {
    return (this._sources ??= new SourcesResource(this._httpClient));
  }

  get keys(): KeysResource {
    return (this._keys ??= new KeysResource(this._httpClient));
  }

  get sharing(): SharingResource {
    return (this._sharing ??= new SharingResource(this._httpClient));
  }

  get audit(): AuditResource {
    return (this._audit ??= new AuditResource(this._httpClient));
  }

  get usage(): UsageResource {
    return (this._usage ??= new UsageResource(this._httpClient));
  }

  /**
   * Convenience method: resolve user, ensure access policy, create embed session.
   * This is the flagship method for the embed use case.
   */
  getSession(params: GetSessionParams): Promise<GetSessionResult> {
    return getSession(this, params);
  }
}
