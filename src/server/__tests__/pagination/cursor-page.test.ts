import { CursorPage } from '../../pagination/cursor-page.js';
import { QuerriError } from '../../errors.js';

describe('CursorPage', () => {
  it('exposes data, hasMore, and nextCursor properties', () => {
    const page = new CursorPage(
      { data: [1, 2, 3], has_more: true, next_cursor: 'abc' },
      vi.fn(),
    );

    expect(page.data).toEqual([1, 2, 3]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('abc');
  });

  it('async iterator yields all items across pages', async () => {
    const fetchPage = vi.fn();

    const page2 = new CursorPage(
      { data: [4, 5], has_more: false, next_cursor: null },
      fetchPage,
    );

    fetchPage.mockResolvedValueOnce(page2);

    const page1 = new CursorPage(
      { data: [1, 2, 3], has_more: true, next_cursor: 'cur2' },
      fetchPage,
    );

    const items: number[] = [];
    for await (const item of page1) {
      items.push(item);
    }

    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledWith('cur2');
  });

  it('toArray() collects all items across pages', async () => {
    const fetchPage = vi.fn();

    const page2 = new CursorPage(
      { data: ['c', 'd'], has_more: false, next_cursor: null },
      fetchPage,
    );

    fetchPage.mockResolvedValueOnce(page2);

    const page1 = new CursorPage(
      { data: ['a', 'b'], has_more: true, next_cursor: 'next' },
      fetchPage,
    );

    const all = await page1.toArray();
    expect(all).toEqual(['a', 'b', 'c', 'd']);
  });

  it('getNextPage() throws when no more pages', async () => {
    const page = new CursorPage(
      { data: [1], has_more: false, next_cursor: null },
      vi.fn(),
    );

    await expect(page.getNextPage()).rejects.toThrow(QuerriError);
    await expect(page.getNextPage()).rejects.toThrow('No more pages');
  });

  it('first() returns the first item', () => {
    const page = new CursorPage(
      { data: ['x', 'y'], has_more: false, next_cursor: null },
      vi.fn(),
    );

    expect(page.first()).toBe('x');
  });

  it('first() returns undefined for an empty page', () => {
    const page = new CursorPage(
      { data: [], has_more: false, next_cursor: null },
      vi.fn(),
    );

    expect(page.first()).toBeUndefined();
  });
});
