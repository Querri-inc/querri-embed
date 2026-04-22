import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  Dashboard,
  DashboardCreateParams,
  DashboardUpdateParams,
  DashboardUpdateResponse,
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

  list(
    params?: { limit?: number; after?: string; user_id?: string },
  ): Promise<CursorPage<Dashboard>> {
    return this._list<Dashboard>('/dashboards', params);
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

  del(dashboardId: string): Promise<DashboardDeleteResponse> {
    return this._delete<DashboardDeleteResponse>(`/dashboards/${dashboardId}`);
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
