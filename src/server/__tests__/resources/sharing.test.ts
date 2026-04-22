import { firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('SharingResource', () => {
  it('shareProject() sends POST /projects/{id}/shares', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'sh1' }));

    await makeClient(mockFetch).sharing.shareProject('p1', {
      user_id: 'u1',
      permission: 'edit',
    });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/shares');
    expect(method).toBe('POST');
  });

  it('revokeProjectShare() sends DELETE /projects/{id}/shares/{userId}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ revoked: true }));

    await makeClient(mockFetch).sharing.revokeProjectShare('p1', 'u1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/shares/u1');
    expect(method).toBe('DELETE');
  });

  it('listProjectShares() sends GET /projects/{id}/shares', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await makeClient(mockFetch).sharing.listProjectShares('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/shares');
    expect(method).toBe('GET');
  });

  it('shareDashboard() sends POST /dashboards/{id}/shares', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'sh2' }));

    await makeClient(mockFetch).sharing.shareDashboard('d1', {
      user_id: 'u1',
    });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1/shares');
    expect(method).toBe('POST');
  });

  it('revokeDashboardShare() sends DELETE /dashboards/{id}/shares/{userId}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ revoked: true }));

    await makeClient(mockFetch).sharing.revokeDashboardShare('d1', 'u1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1/shares/u1');
    expect(method).toBe('DELETE');
  });

  it('listDashboardShares() sends GET /dashboards/{id}/shares', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await makeClient(mockFetch).sharing.listDashboardShares('d1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/dashboards/d1/shares');
    expect(method).toBe('GET');
  });

  it('shareSource() sends POST /sources/{id}/shares', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'sh3' }));

    await makeClient(mockFetch).sharing.shareSource('s1', {
      user_id: 'u1',
    });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/shares');
    expect(method).toBe('POST');
  });

  it('orgShareSource() sends POST /sources/{id}/org-share', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ shared: true }));

    await makeClient(mockFetch).sharing.orgShareSource('s1', {
      permission: 'view',
    } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/sources/s1/org-share');
    expect(method).toBe('POST');
  });
});
