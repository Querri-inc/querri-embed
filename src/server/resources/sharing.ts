import { BaseResource } from './base-resource.js';
import type {
  ShareEntry,
  ShareParams,
  ShareRevokeResponse,
  OrgShareSourceParams,
  OrgShareSourceResponse,
  WorkspaceShare,
  WorkspaceShareParams,
  WorkspaceShareTarget,
} from '../types.js';

export class SharingResource extends BaseResource {
  shareProject(
    projectId: string,
    params: ShareParams,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/projects/${projectId}/shares`, {
      user_id: params.user_id,
      permission: params.permission ?? 'view',
      expires_at: params.expires_at,
    });
  }

  revokeProjectShare(
    projectId: string,
    userId: string,
  ): Promise<ShareRevokeResponse> {
    return this._delete<ShareRevokeResponse>(
      `/projects/${projectId}/shares/${userId}`,
    );
  }

  listProjectShares(projectId: string): Promise<ShareEntry[]> {
    return this._get<ShareEntry[]>(`/projects/${projectId}/shares`);
  }

  shareDashboard(
    dashboardId: string,
    params: ShareParams,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/dashboards/${dashboardId}/shares`, {
      user_id: params.user_id,
      permission: params.permission ?? 'view',
      expires_at: params.expires_at,
    });
  }

  revokeDashboardShare(
    dashboardId: string,
    userId: string,
  ): Promise<ShareRevokeResponse> {
    return this._delete<ShareRevokeResponse>(
      `/dashboards/${dashboardId}/shares/${userId}`,
    );
  }

  listDashboardShares(dashboardId: string): Promise<ShareEntry[]> {
    return this._get<ShareEntry[]>(`/dashboards/${dashboardId}/shares`);
  }

  shareSource(
    sourceId: string,
    params: ShareParams,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/sources/${sourceId}/shares`, {
      user_id: params.user_id,
      permission: params.permission ?? 'view',
      expires_at: params.expires_at,
    });
  }

  orgShareSource(
    sourceId: string,
    params: OrgShareSourceParams,
  ): Promise<OrgShareSourceResponse> {
    return this._post<OrgShareSourceResponse>(
      `/sources/${sourceId}/org-share`,
      params,
    );
  }

  /**
   * Workspaces a resource is shared to. `resourceType` is passed through to the
   * server (known: source, connector, project, dashboard, site; collection once
   * supported); an unsupported type surfaces the server's 4xx message.
   */
  async listWorkspaceShares(target: WorkspaceShareTarget): Promise<WorkspaceShare[]> {
    const res = await this._get<{ data: WorkspaceShare[] }>('/sharing/workspace', {
      resource_type: target.resourceType,
      resource_id: target.resourceId,
    });
    return res.data;
  }

  shareToWorkspace(params: WorkspaceShareParams): Promise<unknown> {
    return this._post<unknown>('/sharing/workspace', toBody(params));
  }

  unshareFromWorkspace(params: WorkspaceShareParams): Promise<unknown> {
    return this._client.request<unknown>({
      method: 'DELETE',
      path: '/sharing/workspace',
      body: toBody(params),
    });
  }
}

function toBody(p: WorkspaceShareParams) {
  return {
    resource_type: p.resourceType,
    resource_id: p.resourceId,
    workspace_id: p.workspaceId,
    relation: p.relation,
  };
}
