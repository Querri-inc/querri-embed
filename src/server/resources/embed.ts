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

  listSessions(
    params?: { limit?: number; after?: string },
  ): Promise<EmbedSessionList> {
    return this._get<EmbedSessionList>('/embed/sessions', {
      limit: params?.limit ?? 100,
      after: params?.after,
    });
  }

  revokeSession(sessionId: string): Promise<EmbedSessionRevokeResponse> {
    return this._delete<EmbedSessionRevokeResponse>(
      `/embed/sessions/${sessionId}`,
    );
  }

  /**
   * Revoke all embed sessions for a given user ID.
   * Lists active sessions and revokes those matching the user.
   *
   * Note: The embed sessions endpoint uses Redis SCAN and always returns
   * has_more=false, so a single request fetches all available sessions.
   *
   * @returns Number of sessions revoked.
   */
  async revokeUserSessions(userId: string): Promise<number> {
    const { data } = await this.listSessions();
    let revoked = 0;
    for (const session of data) {
      if (session.user_id === userId) {
        await this.revokeSession(session.session_token);
        revoked++;
      }
    }
    return revoked;
  }
}
