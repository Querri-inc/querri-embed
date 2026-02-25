import { QuerriError } from '../errors.js';
import type { CursorPageResponse } from '../types.js';

export class CursorPage<T> implements AsyncIterable<T> {
  readonly data: T[];
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
  readonly total: number | undefined;

  private readonly _fetchPage: (cursor?: string) => Promise<CursorPage<T>>;

  constructor(
    response: CursorPageResponse<T>,
    fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  ) {
    this.data = response.data;
    this.hasMore = response.has_more;
    this.nextCursor = response.next_cursor;
    this.total = response.total;
    this._fetchPage = fetchPage;
  }

  async getNextPage(): Promise<CursorPage<T>> {
    if (!this.hasMore || !this.nextCursor) {
      throw new QuerriError('No more pages available');
    }
    return this._fetchPage(this.nextCursor);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let page: CursorPage<T> = this;
    while (true) {
      for (const item of page.data) {
        yield item;
      }
      if (!page.hasMore || !page.nextCursor) break;
      page = await page._fetchPage(page.nextCursor);
    }
  }

  async toArray(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }

  first(): T | undefined {
    return this.data[0];
  }
}
