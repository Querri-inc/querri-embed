import { HttpClient } from './http/base-client.js';
import type { GetSessionResult, SessionConfig } from './types.js';

import { ProjectsResource } from './resources/projects.js';
import { DashboardsResource } from './resources/dashboards.js';
import { SourcesResource } from './resources/sources.js';
import { DataResource } from './resources/data.js';
import { ChatsResource } from './resources/chats.js';

/**
 * The dashboards surface available to a user-scoped client.
 *
 * Dashboards are READ-ONLY under embed sessions: the server excludes the
 * `admin:dashboards:write` scope from embed-session credentials, so
 * `create`, `update`, `del`, and `refresh` are refused with a permission
 * error. Only the read methods are exposed here.
 */
export type UserDashboardsResource = Pick<
  DashboardsResource,
  'retrieve' | 'list' | 'refreshStatus'
>;

/**
 * A user-scoped client that calls the public API (`/api/v1`) using an embed
 * session token. Embed sessions carry per-user scopes and FGA filtering, so
 * resource lists only return items the user has access to.
 *
 * Embed sessions cannot mint further sessions (the server excludes
 * `embed:session:create`), so there is no `embed` accessor here — use the
 * parent API-key client for session management.
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

  /** Dashboards, read-only — embed sessions cannot write dashboards. */
  get dashboards(): UserDashboardsResource {
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
