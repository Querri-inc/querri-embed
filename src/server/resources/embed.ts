import { BaseResource } from './base-resource.js';
import type {
  CreateSessionParams,
  EmbedSession,
  EmbedSessionList,
  EmbedSessionRevokeResponse,
} from '../types.js';

export class EmbedResource extends BaseResource {
  createSession(params: CreateSessionParams): Promise<EmbedSession> {
    return this._post<EmbedSession>('/embed/sessions', {
      user_id: params.user_id,
      origin: params.origin,
      ttl: params.ttl ?? 3600,
    });
  }

  refreshSession(sessionToken: string): Promise<EmbedSession> {
    return this._post<EmbedSession>('/embed/sessions/refresh', {
      session_token: sessionToken,
    });
  }

  listSessions(limit?: number): Promise<EmbedSessionList> {
    return this._get<EmbedSessionList>('/embed/sessions', {
      limit: limit ?? 100,
    });
  }

  revokeSession(sessionId: string): Promise<EmbedSessionRevokeResponse> {
    return this._delete<EmbedSessionRevokeResponse>(
      `/embed/sessions/${sessionId}`,
    );
  }
}
