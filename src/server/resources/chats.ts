import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import { ChatStream } from '../streaming/chat-stream.js';
import type {
  Chat,
  ChatCreateParams,
  ChatStreamParams,
  ChatDeleteResponse,
  ChatCancelResponse,
} from '../types.js';

export class ChatsResource extends BaseResource {
  create(projectId: string, params?: ChatCreateParams): Promise<Chat> {
    return this._post<Chat>(`/projects/${projectId}/chats`, params);
  }

  retrieve(projectId: string, chatId: string): Promise<Chat> {
    return this._get<Chat>(`/projects/${projectId}/chats/${chatId}`);
  }

  list(
    projectId: string,
    params?: { limit?: number; after?: string },
  ): Promise<CursorPage<Chat>> {
    return this._list<Chat>(`/projects/${projectId}/chats`, params);
  }

  async stream(
    projectId: string,
    chatId: string,
    params: ChatStreamParams,
  ): Promise<ChatStream> {
    const response = await this._stream(
      `/projects/${projectId}/chats/${chatId}/stream`,
      params,
    );
    return new ChatStream(response);
  }

  cancel(projectId: string, chatId: string): Promise<ChatCancelResponse> {
    return this._post<ChatCancelResponse>(
      `/projects/${projectId}/chats/${chatId}/cancel`,
    );
  }

  del(projectId: string, chatId: string): Promise<ChatDeleteResponse> {
    return this._delete<ChatDeleteResponse>(`/projects/${projectId}/chats/${chatId}`);
  }
}
