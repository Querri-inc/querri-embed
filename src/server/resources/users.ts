import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  User,
  UserCreateParams,
  UserUpdateParams,
  UserDeleteResponse,
} from '../types.js';

export class UsersResource extends BaseResource {
  create(params: UserCreateParams): Promise<User> {
    return this._post<User>('/users', params);
  }

  retrieve(userId: string): Promise<User> {
    return this._get<User>(`/users/${userId}`);
  }

  list(
    params?: { limit?: number; after?: string; external_id?: string },
  ): Promise<CursorPage<User>> {
    return this._list<User>('/users', params);
  }

  update(userId: string, params: UserUpdateParams): Promise<User> {
    return this._patch<User>(`/users/${userId}`, params);
  }

  del(userId: string): Promise<UserDeleteResponse> {
    return this._delete<UserDeleteResponse>(`/users/${userId}`);
  }

  getOrCreate(
    externalId: string,
    params?: {
      email?: string;
      first_name?: string;
      last_name?: string;
      role?: string;
    },
  ): Promise<User> {
    return this._put<User>(`/users/external/${externalId}`, params);
  }
}
