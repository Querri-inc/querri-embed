import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('DataResource', () => {
  it('list() sends GET /sources', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).data.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources');
    expect(method).toBe('GET');
  });

  it('retrieve() sends GET /sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1' }));

    await makeClient(mockFetch).data.retrieve('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1');
    expect(method).toBe('GET');
  });

  it('create() sends POST /sources with {name, rows}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's_new' }));

    await makeClient(mockFetch).data.create({ name: 'X', rows: [{ a: 1 }] });

    const { url, method, body } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual({ name: 'X', rows: [{ a: 1 }] });
  });

  it('appendRows() sends POST /sources/{id}/rows', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows_written: 1 }));

    await makeClient(mockFetch).data.appendRows('s1', { rows: [{ a: 1 }] });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/rows');
    expect(method).toBe('POST');
  });

  it('replaceRows() sends PUT /sources/{id}/data', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows_written: 1 }));

    await makeClient(mockFetch).data.replaceRows('s1', { rows: [{ a: 1 }] });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/data');
    expect(method).toBe('PUT');
  });

  it('del() sends DELETE /sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1', deleted: true }));

    await makeClient(mockFetch).data.del('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1');
    expect(method).toBe('DELETE');
  });

  it('query() sends POST /sources/{id}/query with source_id in the path, not the body', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], total_rows: 0, page: 1, page_size: 100 }),
    );

    await makeClient(mockFetch).data.query({
      sql: 'SELECT 1',
      source_id: 's1',
      page: 2,
      page_size: 50,
    });

    const { url, method, body } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/query');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual({
      sql: 'SELECT 1',
      page: 2,
      page_size: 50,
    });
  });

  it('getSourceData() sends GET /sources/{id}/data', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], total_rows: 0, page: 1, page_size: 100 }),
    );

    await makeClient(mockFetch).data.getSourceData('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/data');
    expect(method).toBe('GET');
  });
});
