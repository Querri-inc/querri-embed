import { BaseResource } from './base-resource.js';
import type {
  Source,
  SourceCreateParams,
  SourceUpdateParams,
} from '../types.js';

export class SourcesResource extends BaseResource {
  listConnectors(): Promise<Record<string, unknown>[]> {
    return this._get<Record<string, unknown>[]>('/connectors');
  }

  create(params: SourceCreateParams): Promise<Source> {
    return this._post<Source>('/sources', params);
  }

  list(): Promise<Source[]> {
    return this._get<Source[]>('/sources');
  }

  update(sourceId: string, params: SourceUpdateParams): Promise<Source> {
    return this._patch<Source>(`/sources/${sourceId}`, params);
  }

  del(sourceId: string): Promise<void> {
    return this._delete(`/sources/${sourceId}`);
  }

  sync(sourceId: string): Promise<Record<string, unknown>> {
    return this._post<Record<string, unknown>>(`/sources/${sourceId}/sync`);
  }
}
