import { HttpClient } from './http/base-client.js';
import type { GetSessionResult, SessionConfig } from './types.js';

import { ProjectsResource } from './resources/projects.js';
import { DashboardsResource } from './resources/dashboards.js';
import { SourcesResource } from './resources/sources.js';
import { DataResource } from './resources/data.js';
import { ChatsResource } from './resources/chats.js';

/**
 * A user-scoped client that calls the internal API (`/api/`) using an embed
 * session token. The internal API applies FGA filtering automatically, so
 * resource lists only return items the user has access to.
 *
 * Create via `client.asUser(session)`.
 */
export class UserQuerri {
  private readonly _httpClient: HttpClient;

  private _projects?: ProjectsResource;
  private _dashboards?: DashboardsResource;
  private _sources?: SourcesResource;
  private _data?: DataResource;
  private _chats?: ChatsResource;

  constructor(session: GetSessionResult, parentConfig: SessionParentConfig) {
    this._httpClient = new HttpClient({
      sessionToken: session.session_token,
      host: parentConfig.host,
      timeout: parentConfig.timeout,
      maxRetries: parentConfig.maxRetries,
      fetch: parentConfig.fetch,
    } satisfies SessionConfig);
  }

  get projects(): ProjectsResource {
    return (this._projects ??= new ProjectsResource(this._httpClient));
  }

  get dashboards(): DashboardsResource {
    return (this._dashboards ??= new DashboardsResource(this._httpClient));
  }

  get sources(): SourcesResource {
    return (this._sources ??= new SourcesResource(this._httpClient));
  }

  get data(): DataResource {
    return (this._data ??= new DataResource(this._httpClient));
  }

  get chats(): ChatsResource {
    return (this._chats ??= new ChatsResource(this._httpClient));
  }
}

/** Config values forwarded from the parent `Querri` client. */
export interface SessionParentConfig {
  host: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
}
