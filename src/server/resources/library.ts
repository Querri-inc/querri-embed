import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type {
  CursorPageResponse,
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
type Row = Record<string, unknown>;

/**
 * Unwrap a Library SPEC 5.1 envelope `{data: {...}, library_id, telemetry}`:
 * the `data` object with `library_id` splatted in. An unwrapped body is
 * returned as-is.
 */
function unwrapDict<T>(raw: unknown): T {
  const env = raw as Row;
  const data = env?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { library_id: env.library_id, ...(data as Row) } as T;
  }
  return raw as T;
}

function withId(row: Row): LibraryNode {
  return { ...row, id: (row.id as string) || (row._id as string) || '' } as LibraryNode;
}

export class LibraryResource extends BaseResource {
  /**
   * Nodes of one kind. Pages by OFFSET (`limit`/`offset`; the next page is
   * fetched with `offset=<next_offset>`). The server does not take a
   * workspace param here: the workspace comes from the client's `workspaceId`
   * (the `X-Querri-Workspace` header).
   */
  async listNodes(params: LibraryListNodesParams): Promise<CursorPage<LibraryNode>> {
    const fetchPage = async (offset?: string): Promise<CursorPage<LibraryNode>> => {
      const raw = await this._get<Row>('/library/nodes', {
        library_id: params.libraryId,
        node_kind: params.nodeKind,
        limit: params.limit,
        offset: offset !== undefined ? Number(offset) : undefined,
      });
      const data = raw.data;
      if (Array.isArray(data)) {
        return new CursorPage<LibraryNode>(
          { data: (data as Row[]).map(withId), has_more: false, next_cursor: null },
          fetchPage,
        );
      }
      const d = (data ?? {}) as Row;
      const results = ((d.results as Row[] | undefined) ?? []).map(withId);
      const next = d.next_offset as number | null | undefined;
      const hasMore = Boolean(d.has_more) && next !== null && next !== undefined;
      return new CursorPage<LibraryNode>(
        {
          data: results,
          has_more: hasMore,
          next_cursor: hasMore ? String(next) : null,
          total: d.total as number | undefined,
        },
        fetchPage,
      );
    };
    return fetchPage(params.offset !== undefined ? String(params.offset) : undefined);
  }

  /** View nodes additionally carry `build` and `shared_to`. */
  async getNode(nodeId: string): Promise<LibraryNode> {
    return unwrapDict<LibraryNode>(
      await this._get<unknown>(`/library/nodes/${encodeURIComponent(nodeId)}`),
    );
  }

  /** Re-home a node in another workspace. Edges are kept. */
  async moveNode(nodeId: string, workspaceId: string): Promise<LibraryNode> {
    return unwrapDict<LibraryNode>(
      await this._post<unknown>(
        `/library/nodes/${encodeURIComponent(nodeId)}/move`,
        { workspace_id: workspaceId },
      ),
    );
  }

  /** Fact nodes. Plain `{data, has_more, next_cursor}` list; pages with `cursor`. */
  async listFacts(params: LibraryListFactsParams): Promise<CursorPage<LibraryNode>> {
    const fetchPage = async (cursor?: string): Promise<CursorPage<LibraryNode>> => {
      const raw = await this._get<CursorPageResponse<Row>>('/library/facts', {
        library_id: params.libraryId,
        workspace_id: params.workspaceId,
        limit: params.limit,
        cursor,
      });
      return new CursorPage<LibraryNode>(
        {
          data: (raw.data ?? []).map(withId),
          has_more: raw.has_more ?? false,
          next_cursor: raw.next_cursor ?? null,
          total: raw.total,
        },
        fetchPage,
      );
    };
    return fetchPage(params.cursor);
  }

  /** The response's `warnings` lists non-fatal issues (e.g. `targets_not_visible`). */
  async createFact(params: LibraryCreateFactParams): Promise<LibraryFact> {
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
    return unwrapDict<LibraryFact>(await this._post<unknown>('/library/facts', body));
  }

  async factKinds(): Promise<string[]> {
    const res = await this._get<{ data: string[] }>('/library/fact-kinds');
    return res.data;
  }

  async kpiCategories(libraryId: string): Promise<Record<string, unknown>> {
    return unwrapDict<Record<string, unknown>>(
      await this._get<unknown>('/library/kpi-categories', { library_id: libraryId }),
    );
  }
}
