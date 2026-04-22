import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  Policy,
  PolicyCreateParams,
  PolicyUpdateParams,
  PolicyUpdateResponse,
  PolicyDeleteResponse,
  PolicyAssignResponse,
  PolicyRemoveUserResponse,
  PolicyReplaceResponse,
  ResolveAccessParams,
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

  list(
    params?: { name?: string; limit?: number; after?: string },
  ): Promise<CursorPage<Policy>> {
    return this._list<Policy>('/access/policies', params);
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

  /**
   * Atomically replace ALL policy assignments for a user.
   *
   * Removes every existing assignment, then assigns exactly the listed
   * policies. Pass an empty array to remove all policies.
   */
  replaceUserPolicies(
    userId: string,
    params: { policy_ids: string[] },
  ): Promise<PolicyReplaceResponse> {
    return this._put<PolicyReplaceResponse>(
      `/access/users/${userId}/policies`,
      params,
    );
  }

  resolve(params: ResolveAccessParams): Promise<ResolvedAccess> {
    return this._post<ResolvedAccess>('/access/resolve', params);
  }

  async columns(sourceId?: string): Promise<SourceColumns[]> {
    const response = await this._get<{ data: SourceColumns[] } | SourceColumns[]>(
      '/access/columns',
      { source_id: sourceId },
    );
    // Unwrap {data: [...]} envelope returned by the API
    return Array.isArray(response) ? response : response.data;
  }
}
