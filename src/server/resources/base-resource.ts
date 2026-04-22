import { HttpClient } from '../http/base-client.js';
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
      const raw = await this._get<CursorPageResponse<T> | Record<string, unknown>>(path, q);
      const response = normalizePage<T>(raw);
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

/**
 * Normalize a list response into the `CursorPageResponse<T>` shape.
 *
 * The public API (`/api/v1`) already returns `{data, has_more, next_cursor}`.
 * The internal API (`/api/`) returns collection-keyed envelopes like
 * `{projects: [...], has_more, next_cursor}` or `{sources: [...], ...}`.
 * This function detects the latter and maps it into the standard shape so
 * `CursorPage` can consume it uniformly.
 */
function normalizePage<T>(raw: CursorPageResponse<T> | Record<string, unknown>): CursorPageResponse<T> {
  if (Array.isArray(raw.data)) {
    return raw as unknown as CursorPageResponse<T>;
  }

  // Find the first array-valued key that isn't a known metadata field
  const META_KEYS = new Set(['has_more', 'next_cursor', 'total']);
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && !META_KEYS.has(key)) {
      return {
        data: value as T[],
        has_more: (raw.has_more as boolean) ?? false,
        next_cursor: (raw.next_cursor as string | null) ?? null,
        total: raw.total as number | undefined,
      };
    }
  }

  // Fallback: treat as empty page
  return { data: [], has_more: false, next_cursor: null };
}
