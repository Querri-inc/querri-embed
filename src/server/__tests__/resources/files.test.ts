import { emptyPage, firstCall, jsonResponse, makeClient, makeMockFetch } from './_client-helpers.js';

describe('FilesResource', () => {
  it('upload() sends POST /files/upload with FormData body', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'f1' }));

    await makeClient(mockFetch).files.upload(new Blob(['hi']), 'hi.txt');

    const { url, method, body } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/files/upload');
    expect(method).toBe('POST');
    expect(body).toBeInstanceOf(FormData);
  });

  it('retrieve() sends GET /files/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'f1' }));

    await makeClient(mockFetch).files.retrieve('f1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/files/f1');
    expect(method).toBe('GET');
  });

  it('list() sends GET /files', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyPage));

    await makeClient(mockFetch).files.list();

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/files');
    expect(method).toBe('GET');
  });

  it('del() sends DELETE /files/{id}', async () => {
    const mockFetch = makeMockFetch();
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'f1', deleted: true }));

    await makeClient(mockFetch).files.del('f1');

    const { url, method } = firstCall(mockFetch);
    expect(url).toContain('/api/v1/files/f1');
    expect(method).toBe('DELETE');
  });
});
