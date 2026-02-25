import { BaseResource } from './base-resource.js';
import type {
  Policy,
  PolicyCreateParams,
  PolicyUpdateParams,
  PolicyUpdateResponse,
  PolicyDeleteResponse,
  PolicyAssignResponse,
  PolicyRemoveUserResponse,
  ResolvedAccess,
  SourceColumns,
} from '../types.js';

export class PoliciesResource extends BaseResource {
  create(params: PolicyCreateParams): Promise<Policy> {
    return this._post<Policy>('/access/policies', params);
  }

  retrieve(policyId: string): Promise<Policy> {
    return this._get<Policy>(`/access/policies/${policyId}`);
  }

  list(params?: { name?: string }): Promise<Policy[]> {
    return this._get<Policy[]>('/access/policies', params);
  }

  update(
    policyId: string,
    params: PolicyUpdateParams,
  ): Promise<PolicyUpdateResponse> {
    return this._patch<PolicyUpdateResponse>(
      `/access/policies/${policyId}`,
      params,
    );
  }

  del(policyId: string): Promise<PolicyDeleteResponse> {
    return this._delete<PolicyDeleteResponse>(`/access/policies/${policyId}`);
  }

  assignUsers(
    policyId: string,
    params: { user_ids: string[] },
  ): Promise<PolicyAssignResponse> {
    return this._post<PolicyAssignResponse>(
      `/access/policies/${policyId}/users`,
      params,
    );
  }

  removeUser(
    policyId: string,
    userId: string,
  ): Promise<PolicyRemoveUserResponse> {
    return this._delete<PolicyRemoveUserResponse>(
      `/access/policies/${policyId}/users/${userId}`,
    );
  }

  resolve(userId: string, sourceId: string): Promise<ResolvedAccess> {
    return this._post<ResolvedAccess>('/access/resolve', {
      user_id: userId,
      source_id: sourceId,
    });
  }

  columns(sourceId?: string): Promise<SourceColumns[]> {
    return this._get<SourceColumns[]>('/access/columns', {
      source_id: sourceId,
    });
  }
}
