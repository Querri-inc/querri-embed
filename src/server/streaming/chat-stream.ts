import { QuerriError, StreamError } from '../errors.js';
import { decodeSSE } from './sse-decoder.js';

/**
 * Parses a streaming chat response in Vercel AI SDK format.
 *
 * Line prefixes:
 *   0:  text chunk (JSON-encoded string)
 *   e:  error (JSON-encoded object)
 *   d:  done signal
 */
export class ChatStream implements AsyncIterable<string> {
  private readonly response: Response;
  private _messageId: string | undefined;
  private _consumed = false;

  constructor(response: Response) {
    this.response = response;
    this._messageId = response.headers.get('x-message-id') ?? undefined;
  }

  get messageId(): string | undefined {
    return this._messageId;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    if (this._consumed) {
      throw new QuerriError('Stream has already been consumed');
    }
    this._consumed = true;

    if (!this.response.body) {
      throw new QuerriError('Response body is null');
    }

    for await (const event of decodeSSE(this.response.body)) {
      const line = event.data;
      if (line.startsWith('0:')) {
        try {
          const text = JSON.parse(line.slice(2)) as string;
          yield text;
        } catch {
          yield line.slice(2);
        }
      } else if (line.startsWith('e:')) {
        let errorMsg: string;
        try {
          const parsed = JSON.parse(line.slice(2));
          errorMsg = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
          errorMsg = line.slice(2);
        }
        throw new StreamError(`Stream error: ${errorMsg}`);
      } else if (line.startsWith('d:')) {
        return;
      }
    }
  }

  async text(): Promise<string> {
    let result = '';
    for await (const chunk of this) {
      result += chunk;
    }
    return result;
  }

  toReadableStream(): ReadableStream<Uint8Array> {
    if (!this.response.body) {
      throw new QuerriError('Response body is null');
    }
    return this.response.body;
  }
}
