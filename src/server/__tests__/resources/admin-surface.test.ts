import { firstCall, jsonResponse, makeClient, makeMockFetch, emptyPage } from './_client-helpers.js';
import { Querri } from '../../client.js';

describe('admin surface', () => {
  it('workspaces.list() GETs /workspaces', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ data: [{ id: 'w1' }], has_more: false, next_cursor: null }));
    const page = await makeClient(f).workspaces.list();
    const { url, method } = firstCall(f);
    expect(url).toContain('/api/v1/workspaces');
    expect(method).toBe('GET');
    expect(page.data[0].id).toBe('w1');
  });

  it('workspaces.get() and members()', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ id: 'w1' }));
    await makeClient(f).workspaces.get('w1');
    expect(firstCall(f).url).toContain('/api/v1/workspaces/w1');
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse({ data: [{ user_id: 'u1' }] }));
    const m = await makeClient(g).workspaces.members('w1');
    expect(firstCall(g).url).toContain('/api/v1/workspaces/w1/members');
    expect(m[0].user_id).toBe('u1');
  });

  it('settings.getContext() GETs /settings/context', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ a: 1 }));
    expect(await makeClient(f).settings.getContext()).toEqual({ a: 1 });
    expect(firstCall(f).url).toContain('/api/v1/settings/context');
  });

  it('flags.list() unwraps data', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ data: { x: true } }));
    expect(await makeClient(f).flags.list()).toEqual({ x: true });
    expect(firstCall(f).url).toContain('/api/v1/flags');
  });

  it('sharing workspace list/share/unshare', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ data: [{ workspace_id: 'w1', relation: 'viewer' }] }));
    const c = makeClient(f);
    const shares = await c.sharing.listWorkspaceShares({ resourceType: 'source', resourceId: 's1' });
    let call = firstCall(f);
    expect(call.url).toContain('/api/v1/sharing/workspace?');
    expect(call.url).toContain('resource_type=source');
    expect(call.url).toContain('resource_id=s1');
    expect(shares[0].workspace_id).toBe('w1');

    const p = { resourceType: 'site', resourceId: 's1', workspaceId: 'w1', relation: 'viewer' };
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse({}));
    await makeClient(g).sharing.shareToWorkspace(p);
    call = firstCall(g);
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual({
      resource_type: 'site', resource_id: 's1', workspace_id: 'w1', relation: 'viewer',
    });

    const h = makeMockFetch();
    h.mockResolvedValueOnce(jsonResponse({}));
    await makeClient(h).sharing.unshareFromWorkspace(p);
    call = firstCall(h);
    expect(call.method).toBe('DELETE');
    expect(call.url).toContain('/api/v1/sharing/workspace');
    expect(JSON.parse(call.body as string).workspace_id).toBe('w1');
  });

  it('library.listNodes() / listFacts() send query params', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse(emptyPage));
    await makeClient(f).library.listNodes({ libraryId: 'L', nodeKind: 'View', workspaceId: 'w1' });
    const { url } = firstCall(f);
    expect(url).toContain('/api/v1/library/nodes');
    expect(url).toContain('library_id=L');
    expect(url).toContain('node_kind=View');
    expect(url).toContain('workspace_id=w1');
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse(emptyPage));
    await makeClient(g).library.listFacts({ libraryId: 'L' });
    expect(firstCall(g).url).toContain('/api/v1/library/facts?library_id=L');
  });

  it('library.getNode() returns build/shared_to; moveNode() POSTs', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ id: 'n1', build: { status: 'ready', row_count: 3 }, shared_to: [] }));
    const n = await makeClient(f).library.getNode('n1');
    expect(firstCall(f).url).toContain('/api/v1/library/nodes/n1');
    expect(n.build?.row_count).toBe(3);
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse({ id: 'n1', workspace_id: 'w2' }));
    await makeClient(g).library.moveNode('n1', 'w2');
    const call = firstCall(g);
    expect(call.url).toContain('/api/v1/library/nodes/n1/move');
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual({ workspace_id: 'w2' });
  });

  it('library.createFact() sends workspace_id and returns warnings', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ id: 'f1', warnings: [{ code: 'targets_not_visible', message: 'm' }] }));
    const r = await makeClient(f).library.createFact({ libraryId: 'L', statement: 's', workspaceId: 'w1' });
    const call = firstCall(f);
    expect(call.url).toContain('/api/v1/library/facts');
    const body = JSON.parse(call.body as string);
    expect(body.workspace_id).toBe('w1');
    expect(body.library_id).toBe('L');
    expect(r.warnings?.[0].code).toBe('targets_not_visible');
  });

  it('library.factKinds() / kpiCategories()', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({ data: ['rule'] }));
    expect(await makeClient(f).library.factKinds()).toEqual(['rule']);
    expect(firstCall(f).url).toContain('/api/v1/library/fact-kinds');
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await makeClient(g).library.kpiCategories('L');
    expect(firstCall(g).url).toContain('/api/v1/library/kpi-categories?library_id=L');
  });

  it('workspaceId config sends X-Querri-Workspace', async () => {
    const f = makeMockFetch();
    f.mockResolvedValueOnce(jsonResponse({}));
    const c = new Querri({ apiKey: 'qk_test', workspaceId: 'w9', fetch: f as unknown as typeof fetch, maxRetries: 0 });
    await c.settings.getContext();
    expect(firstCall(f).headers['X-Querri-Workspace']).toBe('w9');
    const g = makeMockFetch();
    g.mockResolvedValueOnce(jsonResponse({}));
    await makeClient(g).settings.getContext();
    expect(firstCall(g).headers['X-Querri-Workspace']).toBeUndefined();
  });
});
