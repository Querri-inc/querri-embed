import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('ProjectsResource', () => {
  it('create() sends POST /projects', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    await makeClient(mockFetch).projects.create({ name: 'X' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects');
    expect(method).toBe('POST');
  });

  it('retrieve() sends GET /projects/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    await makeClient(mockFetch).projects.retrieve('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1');
    expect(method).toBe('GET');
  });

  it('list() sends GET /projects', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).projects.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects');
    expect(method).toBe('GET');
  });

  it('update() sends PUT /projects/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    await makeClient(mockFetch).projects.update('p1', { name: 'Y' } as never);

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1');
    expect(method).toBe('PUT');
  });

  it('del() sends DELETE /projects/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'p1', deleted: true }));

    await makeClient(mockFetch).projects.del('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1');
    expect(method).toBe('DELETE');
  });

  it('run() sends POST /projects/{id}/run with user_id body', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'queued' }));

    await makeClient(mockFetch).projects.run('p1', 'u1');

    const { url, method, body } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/run');
    expect(method).toBe('POST');
    expect(JSON.parse(body as string)).toEqual({ user_id: 'u1' });
  });

  it('runStatus() sends GET /projects/{id}/run/status', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'running' }));

    await makeClient(mockFetch).projects.runStatus('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/run/status');
    expect(method).toBe('GET');
  });

  it('runCancel() sends POST /projects/{id}/run/cancel', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ cancelled: true }));

    await makeClient(mockFetch).projects.runCancel('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/run/cancel');
    expect(method).toBe('POST');
  });

  it('listSteps() sends GET /projects/{id}/steps', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await makeClient(mockFetch).projects.listSteps('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/steps');
    expect(method).toBe('GET');
  });

  it('getStepData() sends GET /projects/{id}/steps/{stepId}/data', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], total_rows: 0, page: 1, page_size: 100 }),
    );

    await makeClient(mockFetch).projects.getStepData('p1', 'step1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/steps/step1/data');
    expect(method).toBe('GET');
  });
});
