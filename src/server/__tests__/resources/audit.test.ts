import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('AuditResource', () => {
  it('list() sends GET /audit/events', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).audit.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/audit/events');
    expect(method).toBe('GET');
  });
});
