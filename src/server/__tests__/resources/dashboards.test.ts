import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('DashboardsResource', () => {
  it('create() sends POST /dashboards', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'd1' }));

    await makeClient(mockFetch).dashboards.create({ name: 'X' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards');
    expect(method).toBe('POST');
  });

  it('retrieve() sends GET /dashboards/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'd1' }));

    await makeClient(mockFetch).dashboards.retrieve('d1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1');
    expect(method).toBe('GET');
  });

  it('list() sends GET /dashboards', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).dashboards.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards');
    expect(method).toBe('GET');
  });

  it('update() sends PATCH /dashboards/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'd1' }));

    await makeClient(mockFetch).dashboards.update('d1', { name: 'Y' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1');
    expect(method).toBe('PATCH');
  });

  it('del() sends DELETE /dashboards/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'd1', deleted: true }));

    await makeClient(mockFetch).dashboards.del('d1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1');
    expect(method).toBe('DELETE');
  });

  it('refresh() sends POST /dashboards/{id}/refresh', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'queued' }));

    await makeClient(mockFetch).dashboards.refresh('d1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1/refresh');
    expect(method).toBe('POST');
  });

  it('refreshStatus() sends GET /dashboards/{id}/refresh/status', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'done' }));

    await makeClient(mockFetch).dashboards.refreshStatus('d1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1/refresh/status');
    expect(method).toBe('GET');
  });
});
