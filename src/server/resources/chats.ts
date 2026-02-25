import { BaseResource } from './base-resource.js';
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

  list(projectId: string, limit?: number): Promise<Chat[]> {
    return this._get<Chat[]>(`/projects/${projectId}/chats`, {
      limit: limit ?? 25,
    });
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

  del(projectId: string, chatId: string): Promise<void> {
    return this._delete(`/projects/${projectId}/chats/${chatId}`);
  }
}
