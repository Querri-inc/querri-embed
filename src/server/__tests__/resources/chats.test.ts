import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('ChatsResource', () => {
  it('create() sends POST /projects/{pid}/chats', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'c1' }));

    await makeClient(mockFetch).chats.create('p1', { prompt: 'hello' });

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats');
    expect(method).toBe('POST');
  });

  it('retrieve() sends GET /projects/{pid}/chats/{cid}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'c1' }));

    await makeClient(mockFetch).chats.retrieve('p1', 'c1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats/c1');
    expect(method).toBe('GET');
  });

  it('list() sends GET /projects/{pid}/chats', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).chats.list('p1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats');
    expect(method).toBe('GET');
  });

  it('cancel() sends POST /projects/{pid}/chats/{cid}/cancel', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ cancelled: true }));

    await makeClient(mockFetch).chats.cancel('p1', 'c1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats/c1/cancel');
    expect(method).toBe('POST');
  });

  it('del() sends DELETE /projects/{pid}/chats/{cid}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'c1', deleted: true }));

    await makeClient(mockFetch).chats.del('p1', 'c1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats/c1');
    expect(method).toBe('DELETE');
  });

  it('stream() sends POST /projects/{pid}/chats/{cid}/stream with SSE Accept header', async () => {
    const mockFetch = makeMockFetch();
    const sseBody = new ReadableStream<Uint8Array>({
      start(c) { c.close(); },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    await makeClient(mockFetch).chats.stream('p1', 'c1', { prompt: 'hi' });

    const { url, method, headers } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/projects/p1/chats/c1/stream');
    expect(method).toBe('POST');
    expect(headers['Accept']).toBe('text/event-stream');
  });
});
