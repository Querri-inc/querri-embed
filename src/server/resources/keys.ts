import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  ApiKey,
  ApiKeyCreateParams,
  ApiKeyCreated,
  KeysDeleteResponse,
} from '../types.js';

export class KeysResource extends BaseResource {
  create(params: ApiKeyCreateParams): Promise<ApiKeyCreated> {
    return this._post<ApiKeyCreated>('/keys', params);
  }

  retrieve(keyId: string): Promise<ApiKey> {
    return this._get<ApiKey>(`/keys/${keyId}`);
  }

  list(
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<ApiKey>> {
    return this._list<ApiKey>('/keys', params);
  }

  del(keyId: string): Promise<KeysDeleteResponse> {
    return this._delete<KeysDeleteResponse>(`/keys/${keyId}`);
  }

  /** Alias for `del()` — revoke and delete an API key. */
  revoke(keyId: string): Promise<KeysDeleteResponse> {
    return this.del(keyId);
  }
}
