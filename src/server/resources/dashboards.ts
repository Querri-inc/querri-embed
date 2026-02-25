import { BaseResource } from './base-resource.js';
import type {
  Dashboard,
  DashboardCreateParams,
  DashboardUpdateParams,
  DashboardUpdateResponse,
  DashboardDeleteResponse,
  DashboardRefreshResponse,
  DashboardRefreshStatus,
} from '../types.js';

export class DashboardsResource extends BaseResource {
  create(params: DashboardCreateParams): Promise<Dashboard> {
    return this._post<Dashboard>('/dashboards', params);
  }

  retrieve(dashboardId: string): Promise<Dashboard> {
    return this._get<Dashboard>(`/dashboards/${dashboardId}`);
  }

  list(params?: { limit?: number; after?: string }): Promise<Dashboard[]> {
    return this._get<Dashboard[]>('/dashboards', params);
  }

  update(
    dashboardId: string,
    params: DashboardUpdateParams,
  ): Promise<DashboardUpdateResponse> {
    return this._patch<DashboardUpdateResponse>(
      `/dashboards/${dashboardId}`,
      params,
    );
  }

  del(dashboardId: string): Promise<void> {
    return this._delete(`/dashboards/${dashboardId}`);
  }

  refresh(dashboardId: string): Promise<DashboardRefreshResponse> {
    return this._post<DashboardRefreshResponse>(
      `/dashboards/${dashboardId}/refresh`,
    );
  }

  refreshStatus(dashboardId: string): Promise<DashboardRefreshStatus> {
    return this._get<DashboardRefreshStatus>(
      `/dashboards/${dashboardId}/refresh/status`,
    );
  }
}
