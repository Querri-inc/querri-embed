import { normalizePage } from '../../resources/base-resource.js';

describe('normalizePage', () => {
  it('passes through a public-API envelope unchanged', () => {
    const raw = {
      data: [{ id: 'a' }, { id: 'b' }],
      has_more: true,
      next_cursor: 'cursor-1',
      total: 42,
    };
    const result = normalizePage<{ id: string }>(raw);
    expect(result).toEqual(raw);
  });

  it('remaps an internal collection-keyed envelope into the standard shape', () => {
    const raw = {
      projects: [{ id: 'p1' }, { id: 'p2' }],
      has_more: true,
      next_cursor: 'cursor-next',
      total: 7,
    };
    const result = normalizePage<{ id: string }>(raw);
    expect(result).toEqual({
      data: [{ id: 'p1' }, { id: 'p2' }],
      has_more: true,
      next_cursor: 'cursor-next',
      total: 7,
    });
  });

  it('works with any collection key name (not just "projects")', () => {
    const raw = {
      sources: [{ id: 's1' }],
      has_more: false,
      next_cursor: null,
    };
    const result = normalizePage<{ id: string }>(raw);
    expect(result.data).toEqual([{ id: 's1' }]);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
  });

  it('supplies safe defaults when has_more / next_cursor are missing from a keyed envelope', () => {
    const raw = {
      users: [{ id: 'u1' }],
    };
    const result = normalizePage<{ id: string }>(raw);
    expect(result).toEqual({
      data: [{ id: 'u1' }],
      has_more: false,
      next_cursor: null,
      total: undefined,
    });
  });

  it('falls back to an empty page when no data or collection key is present', () => {
    const result = normalizePage<{ id: string }>({});
    expect(result).toEqual({ data: [], has_more: false, next_cursor: null });
  });

  it('ignores known metadata keys when scanning for the collection array', () => {
    // `total` is metadata, not a collection — even if (bizarrely) an array,
    // the function should not pick it as the data field. Here it's a number,
    // so the scan finds no arrays and falls back to empty.
    const raw = { has_more: false, next_cursor: null, total: 0 };
    const result = normalizePage<{ id: string }>(raw);
    expect(result).toEqual({ data: [], has_more: false, next_cursor: null });
  });
});
