import { BaseResource } from './base-resource.js';
import type { CursorPage } from '../pagination/cursor-page.js';
import type {
  LibraryNode,
  LibraryFact,
  LibraryListNodesParams,
  LibraryListFactsParams,
  LibraryCreateFactParams,
} from '../types.js';

/**
 * Minimal Library surface. A per-call `workspaceId` homes a create in that
 * workspace; otherwise the client's `workspaceId` (X-Querri-Workspace) applies.
 */
export class LibraryResource extends BaseResource {
  listNodes(params: LibraryListNodesParams): Promise<CursorPage<LibraryNode>> {
    return this._list<LibraryNode>('/library/nodes', {
      library_id: params.libraryId,
      node_kind: params.nodeKind,
      workspace_id: params.workspaceId,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  /** View nodes additionally carry `build` and `shared_to`. */
  getNode(nodeId: string): Promise<LibraryNode> {
    return this._get<LibraryNode>(`/library/nodes/${encodeURIComponent(nodeId)}`);
  }

  /** Re-home a node in another workspace. Edges are kept. */
  moveNode(nodeId: string, workspaceId: string): Promise<LibraryNode> {
    return this._post<LibraryNode>(
      `/library/nodes/${encodeURIComponent(nodeId)}/move`,
      { workspace_id: workspaceId },
    );
  }

  listFacts(params: LibraryListFactsParams): Promise<CursorPage<LibraryNode>> {
    return this._list<LibraryNode>('/library/facts', {
      library_id: params.libraryId,
      workspace_id: params.workspaceId,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  /** The response's `warnings` lists non-fatal issues (e.g. `targets_not_visible`). */
  createFact(params: LibraryCreateFactParams): Promise<LibraryFact> {
    const body: Record<string, unknown> = {
      library_id: params.libraryId,
      statement: params.statement,
      fact_kind: params.factKind ?? 'contextual_note',
      source_node_ids: params.sourceNodeIds ?? [],
      evidence_refs: params.evidenceRefs ?? [],
      confidence: params.confidence ?? 1.0,
    };
    if (params.name) body.name = params.name;
    if (params.workspaceId) body.workspace_id = params.workspaceId;
    return this._post<LibraryFact>('/library/facts', body);
  }

  async factKinds(): Promise<string[]> {
    const res = await this._get<{ data: string[] }>('/library/fact-kinds');
    return res.data;
  }

  kpiCategories(libraryId: string): Promise<unknown> {
    return this._get<unknown>('/library/kpi-categories', { library_id: libraryId });
  }
}
