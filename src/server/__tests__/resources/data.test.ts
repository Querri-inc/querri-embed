import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('DataResource', () => {
  it('list() sends GET /data/sources', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).data.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources');
    expect(method).toBe('GET');
  });

  it('retrieve() sends GET /data/sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1' }));

    await makeClient(mockFetch).data.retrieve('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources/s1');
    expect(method).toBe('GET');
  });

  it('create() sends POST /data/sources', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's_new' }));

    await makeClient(mockFetch).data.create({ name: 'X', rows: [] } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources');
    expect(method).toBe('POST');
  });

  it('appendRows() sends POST /data/sources/{id}/rows', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows_written: 1 }));

    await makeClient(mockFetch).data.appendRows('s1', { rows: [{ a: 1 }] });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources/s1/rows');
    expect(method).toBe('POST');
  });

  it('replaceRows() sends PUT /data/sources/{id}/data', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows_written: 1 }));

    await makeClient(mockFetch).data.replaceRows('s1', { rows: [{ a: 1 }] });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources/s1/data');
    expect(method).toBe('PUT');
  });

  it('del() sends DELETE /data/sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1', deleted: true }));

    await makeClient(mockFetch).data.del('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources/s1');
    expect(method).toBe('DELETE');
  });

  it('query() sends POST /data/query', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], total_rows: 0, page: 1, page_size: 100 }),
    );

    await makeClient(mockFetch).data.query({ sql: 'SELECT 1', source_id: 's1' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/query');
    expect(method).toBe('POST');
  });

  it('getSourceData() sends GET /data/sources/{id}/data', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], total_rows: 0, page: 1, page_size: 100 }),
    );

    await makeClient(mockFetch).data.getSourceData('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/data/sources/s1/data');
    expect(method).toBe('GET');
  });
});
