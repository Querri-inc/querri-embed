import { BaseResource } from './base-resource.js';
import type {
  DataSource,
  QueryParams,
  QueryResult,
  DataPage,
} from '../types.js';

export class DataResource extends BaseResource {
  sources(): Promise<DataSource[]> {
    return this._get<DataSource[]>('/data/sources');
  }

  source(sourceId: string): Promise<DataSource> {
    return this._get<DataSource>(`/data/sources/${sourceId}`);
  }

  query(params: QueryParams): Promise<QueryResult> {
    return this._post<QueryResult>('/data/query', params);
  }

  sourceData(
    sourceId: string,
    params?: { page?: number; page_size?: number },
  ): Promise<DataPage> {
    return this._get<DataPage>(`/data/sources/${sourceId}/data`, params);
  }
}
