import { BaseResource } from './base-resource.js';
import type { ShareEntry, SourceShareParams, OrgShareSourceParams } from '../types.js';

export class SharingResource extends BaseResource {
  shareProject(
    projectId: string,
    userId: string,
    permission?: string,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/projects/${projectId}/shares`, {
      user_id: userId,
      permission: permission ?? 'view',
    });
  }

  revokeProjectShare(
    projectId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    return this._delete<Record<string, unknown>>(
      `/projects/${projectId}/shares/${userId}`,
    );
  }

  listProjectShares(projectId: string): Promise<ShareEntry[]> {
    return this._get<ShareEntry[]>(`/projects/${projectId}/shares`);
  }

  shareDashboard(
    dashboardId: string,
    userId: string,
    permission?: string,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/dashboards/${dashboardId}/shares`, {
      user_id: userId,
      permission: permission ?? 'view',
    });
  }

  revokeDashboardShare(
    dashboardId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    return this._delete<Record<string, unknown>>(
      `/dashboards/${dashboardId}/shares/${userId}`,
    );
  }

  listDashboardShares(dashboardId: string): Promise<ShareEntry[]> {
    return this._get<ShareEntry[]>(`/dashboards/${dashboardId}/shares`);
  }

  shareSource(
    sourceId: string,
    params: SourceShareParams,
  ): Promise<ShareEntry> {
    return this._post<ShareEntry>(`/sources/${sourceId}/shares`, {
      user_id: params.user_id,
      permission: params.permission ?? 'view',
    });
  }

  orgShareSource(
    sourceId: string,
    params: OrgShareSourceParams,
  ): Promise<Record<string, unknown>> {
    return this._post<Record<string, unknown>>(
      `/sources/${sourceId}/org-share`,
      params,
    );
  }
}
