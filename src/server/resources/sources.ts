import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  Source,
  SourceCreateParams,
  SourceUpdateParams,
  SourcesDeleteResponse,
  Connector,
} from '../types.js';

export class SourcesResource extends BaseResource {
  listConnectors(
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<Connector>> {
    return this._list<Connector>('/connectors', params);
  }

  create(params: SourceCreateParams): Promise<Source> {
    return this._post<Source>('/sources', params);
  }

  list(
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<Source>> {
    return this._list<Source>('/sources', params);
  }

  update(sourceId: string, params: SourceUpdateParams): Promise<Source> {
    return this._patch<Source>(`/sources/${sourceId}`, params);
  }

  del(sourceId: string): Promise<SourcesDeleteResponse> {
    return this._delete<SourcesDeleteResponse>(`/sources/${sourceId}`);
  }

  sync(sourceId: string): Promise<Record<string, unknown>> {
    return this._post<Record<string, unknown>>(`/sources/${sourceId}/sync`);
  }
}
