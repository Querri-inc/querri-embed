import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  Project,
  ProjectCreateParams,
  ProjectUpdateParams,
  ProjectDeleteResponse,
  ProjectRunResponse,
  ProjectRunStatus,
  ProjectCancelResponse,
  StepSummary,
  DataPage,
} from '../types.js';

export class ProjectsResource extends BaseResource {
  create(params: ProjectCreateParams): Promise<Project> {
    return this._post<Project>('/projects', params);
  }

  retrieve(projectId: string): Promise<Project> {
    return this._get<Project>(`/projects/${projectId}`);
  }

  list(params?: { limit?: number; after?: string }): Promise<CursorPage<Project>> {
    return this._list<Project>('/projects', params);
  }

  update(projectId: string, params: ProjectUpdateParams): Promise<Project> {
    return this._put<Project>(`/projects/${projectId}`, params);
  }

  del(projectId: string): Promise<void> {
    return this._delete(`/projects/${projectId}`);
  }

  run(projectId: string, userId: string): Promise<ProjectRunResponse> {
    return this._post<ProjectRunResponse>(`/projects/${projectId}/run`, {
      user_id: userId,
    });
  }

  runStatus(projectId: string): Promise<ProjectRunStatus> {
    return this._get<ProjectRunStatus>(`/projects/${projectId}/run/status`);
  }

  runCancel(projectId: string): Promise<ProjectCancelResponse> {
    return this._post<ProjectCancelResponse>(`/projects/${projectId}/run/cancel`);
  }

  listSteps(projectId: string): Promise<StepSummary[]> {
    return this._get<StepSummary[]>(`/projects/${projectId}/steps`);
  }

  getStepData(
    projectId: string,
    stepId: string,
    params?: { page?: number; page_size?: number },
  ): Promise<DataPage> {
    return this._get<DataPage>(`/projects/${projectId}/steps/${stepId}/data`, params);
  }
}
