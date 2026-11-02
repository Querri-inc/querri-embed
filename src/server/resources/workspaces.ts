import { BaseResource } from './base-resource.js';
import type { CursorPage } from '../pagination/cursor-page.js';
import type { Workspace, WorkspaceMember } from '../types.js';

export class WorkspacesResource extends BaseResource {
  /** Workspaces visible to the caller (every workspace in the org for an API key). */
  list(): Promise<CursorPage<Workspace>> {
    return this._list<Workspace>('/workspaces');
  }

  get(workspaceId: string): Promise<Workspace> {
    return this._get<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}`);
  }

  async members(workspaceId: string): Promise<WorkspaceMember[]> {
    const res = await this._get<{ data: WorkspaceMember[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members`,
    );
    return res.data;
  }
}
