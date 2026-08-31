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
    return this._list<DataSource>('/sources', params);
  }

  retrieve(sourceId: string): Promise<DataSource> {
    return this._get<DataSource>(`/sources/${sourceId}`);
  }

  create(params: DataSourceCreateParams): Promise<DataSourceCreateResult> {
    return this._post<DataSourceCreateResult>('/sources', params);
  }

  appendRows(
    sourceId: string,
    params: { rows: Record<string, unknown>[] },
  ): Promise<DataWriteResult> {
    return this._post<DataWriteResult>(
      `/sources/${sourceId}/rows`,
      params,
    );
  }

  replaceRows(
    sourceId: string,
    params: { rows: Record<string, unknown>[] },
  ): Promise<DataWriteResult> {
    return this._put<DataWriteResult>(
      `/sources/${sourceId}/data`,
      params,
    );
  }

  del(sourceId: string): Promise<DataSourceDeleteResult> {
    return this._delete<DataSourceDeleteResult>(`/sources/${sourceId}`);
  }

  query(params: QueryParams): Promise<QueryResult> {
    const { source_id, ...body } = params;
    return this._post<QueryResult>(`/sources/${source_id}/query`, body);
  }

  getSourceData(
    sourceId: string,
    params?: { page?: number; page_size?: number },
  ): Promise<DataPage> {
    return this._get<DataPage>(`/sources/${sourceId}/data`, params);
  }
}
