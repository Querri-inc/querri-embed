import { BaseResource } from './base-resource.js';
import type {
  ShareEntry,
  ShareParams,
  ShareRevokeResponse,
  OrgShareSourceParams,
  OrgShareSourceResponse,
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
}
