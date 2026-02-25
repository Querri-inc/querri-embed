import { BaseResource } from './base-resource.js';
import type {
  ApiKey,
  ApiKeyCreateParams,
  ApiKeyCreated,
} from '../types.js';

export class KeysResource extends BaseResource {
  create(params: ApiKeyCreateParams): Promise<ApiKeyCreated> {
    return this._post<ApiKeyCreated>('/keys', params);
  }

  retrieve(keyId: string): Promise<ApiKey> {
    return this._get<ApiKey>(`/keys/${keyId}`);
  }

  list(): Promise<ApiKey[]> {
    return this._get<ApiKey[]>('/keys');
  }

  del(keyId: string): Promise<Record<string, unknown>> {
    return this._delete<Record<string, unknown>>(`/keys/${keyId}`);
  }
}
