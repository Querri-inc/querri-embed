import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('SourcesResource', () => {
  it('listConnectors() sends GET /connectors', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).sources.listConnectors();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/connectors');
    expect(method).toBe('GET');
  });

  it('create() sends POST /sources with {name, rows}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1' }));

    await makeClient(mockFetch).sources.create({ name: 'X', rows: [{ a: 1 }] });

    const { url, method, body } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual({ name: 'X', rows: [{ a: 1 }] });
  });

  it('list() sends GET /sources', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).sources.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources');
    expect(method).toBe('GET');
  });

  it('update() sends PATCH /sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1' }));

    await makeClient(mockFetch).sources.update('s1', { name: 'Y', description: 'd' });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1');
    expect(method).toBe('PATCH');
  });

  it('del() sends DELETE /sources/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1', deleted: true }));

    await makeClient(mockFetch).sources.del('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1');
    expect(method).toBe('DELETE');
  });

  it('sync() sends POST /sources/{id}/sync', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ started: true }));

    await makeClient(mockFetch).sources.sync('s1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/sync');
    expect(method).toBe('POST');
  });
});
