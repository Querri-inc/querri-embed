import { HttpClient, type RequestOptions } from '../http/base-client.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type { CursorPageResponse } from '../types.js';

export abstract class BaseResource {
  protected readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  protected _get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this._client.request<T>({ method: 'GET', path, query });
  }

  protected _post<T>(path: string, body?: unknown): Promise<T> {
    return this._client.request<T>({ method: 'POST', path, body });
  }

  protected _put<T>(path: string, body?: unknown): Promise<T> {
    return this._client.request<T>({ method: 'PUT', path, body });
  }

  protected _patch<T>(path: string, body?: unknown): Promise<T> {
    return this._client.request<T>({ method: 'PATCH', path, body });
  }

  protected _delete<T = void>(path: string): Promise<T> {
    return this._client.request<T>({ method: 'DELETE', path });
  }

  protected async _list<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<CursorPage<T>> {
    const fetchPage = async (cursor?: string): Promise<CursorPage<T>> => {
      const q: Record<string, string | number | boolean | undefined> = {
        ...query,
      };
      if (cursor) {
        q.after = cursor;
      }
      const response = await this._get<CursorPageResponse<T>>(path, q);
      return new CursorPage<T>(response, fetchPage);
    };
    return fetchPage(query?.after as string | undefined);
  }

  protected _stream(path: string, body?: unknown): Promise<Response> {
    return this._client.request<Response>({
      method: 'POST',
      path,
      body,
      stream: true,
      headers: { Accept: 'text/event-stream' },
    });
  }
}
