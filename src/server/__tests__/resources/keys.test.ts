import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('KeysResource', () => {
  it('create() sends POST /keys', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'k1', key: 'qk_new' }));

    await makeClient(mockFetch).keys.create({ name: 'dev' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/keys');
    expect(method).toBe('POST');
  });

  it('retrieve() sends GET /keys/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'k1' }));

    await makeClient(mockFetch).keys.retrieve('k1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/keys/k1');
    expect(method).toBe('GET');
  });

  it('list() sends GET /keys', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).keys.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/keys');
    expect(method).toBe('GET');
  });

  it('del() sends DELETE /keys/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'k1', deleted: true }));

    await makeClient(mockFetch).keys.del('k1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/keys/k1');
    expect(method).toBe('DELETE');
  });

  it('revoke() aliases del() — DELETE /keys/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'k1', deleted: true }));

    await makeClient(mockFetch).keys.revoke('k1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/keys/k1');
    expect(method).toBe('DELETE');
  });
});
