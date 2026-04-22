import { firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('UsageResource', () => {
  it('orgUsage() sends GET /usage with period=current_month by default', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ period: 'current_month' }));

    await makeClient(mockFetch).usage.orgUsage();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/usage');
    expect(url).toContain('period=current_month');
    expect(method).toBe('GET');
  });

  it('orgUsage() forwards the provided period', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ period: '2026-03' }));

    await makeClient(mockFetch).usage.orgUsage('2026-03');

    const { url } = firstCall(mockFetch);
    expect(url).toContain('period=2026-03');
  });

  it('userUsage() sends GET /usage/users/{id} with period=current_month by default', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ period: 'current_month' }));

    await makeClient(mockFetch).usage.userUsage('u1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/usage/users/u1');
    expect(url).toContain('period=current_month');
    expect(method).toBe('GET');
  });
});
