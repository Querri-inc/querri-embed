import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  DataSource,
  DataSourceCreateParams,
  DataSourceCreateResult,
  DataWriteResult,
  DataSourceDeleteResult,
  QueryParams,
  QueryResult,
  DataPage,
} from '../types.js';

export class DataResource extends BaseResource {
  list(
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<DataSource>> {
    return this._list<DataSource>('/data/sources', params);
  }

  retrieve(sourceId: string): Promise<DataSource> {
    return this._get<DataSource>(`/data/sources/${sourceId}`);
  }

  create(params: DataSourceCreateParams): Promise<DataSourceCreateResult> {
    return this._post<DataSourceCreateResult>('/data/sources', params);
  }

  appendRows(
    sourceId: string,
    params: { rows: Record<string, unknown>[] },
  ): Promise<DataWriteResult> {
    return this._post<DataWriteResult>(
      `/data/sources/${sourceId}/rows`,
      params,
    );
  }

  replaceRows(
    sourceId: string,
    params: { rows: Record<string, unknown>[] },
  ): Promise<DataWriteResult> {
    return this._put<DataWriteResult>(
      `/data/sources/${sourceId}/data`,
      params,
    );
  }

  del(sourceId: string): Promise<DataSourceDeleteResult> {
    return this._delete<DataSourceDeleteResult>(`/data/sources/${sourceId}`);
  }

  query(params: QueryParams): Promise<QueryResult> {
    return this._post<QueryResult>('/data/query', params);
  }

  getSourceData(
    sourceId: string,
    params?: { page?: number; page_size?: number },
  ): Promise<DataPage> {
    return this._get<DataPage>(`/data/sources/${sourceId}/data`, params);
  }
}
