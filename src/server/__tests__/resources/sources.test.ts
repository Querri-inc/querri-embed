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

  it('create() sends POST /sources', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 's1' }));

    await makeClient(mockFetch).sources.create({ name: 'X' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources');
    expect(method).toBe('POST');
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

    await makeClient(mockFetch).sources.update('s1', { name: 'Y' } as never);

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
