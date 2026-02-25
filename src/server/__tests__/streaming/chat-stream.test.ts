import { ChatStream } from '../../streaming/chat-stream.js';
import { StreamError } from '../../errors.js';

/**
 * Helper: build a Response whose body is an SSE stream from the given lines.
 * Each line is wrapped as `data: <line>\n\n` for the SSE decoder.
 */
function makeStreamResponse(
  lines: string[],
  headers?: Record<string, string>,
): Response {
  const ssePayload = lines.map((l) => `data:${l}\n\n`).join('');
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(ssePayload));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      ...headers,
    },
  });
}

describe('ChatStream', () => {
  it('yields text chunks from "0:" prefixed lines', async () => {
    const response = makeStreamResponse([
      '0:"Hello"',
      '0:" world"',
      'd:{}',
    ]);

    const chatStream = new ChatStream(response);
    const chunks: string[] = [];
    for await (const chunk of chatStream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('throws StreamError on "e:" lines', async () => {
    const response = makeStreamResponse([
      '0:"Hello"',
      'e:"something went wrong"',
    ]);

    const chatStream = new ChatStream(response);
    const chunks: string[] = [];

    await expect(async () => {
      for await (const chunk of chatStream) {
        chunks.push(chunk);
      }
    }).rejects.toThrow(StreamError);

    expect(chunks).toEqual(['Hello']);
  });

  it('stops on "d:" lines', async () => {
    const response = makeStreamResponse([
      '0:"part1"',
      'd:{"finishReason":"stop"}',
      '0:"part2"',
    ]);

    const chatStream = new ChatStream(response);
    const chunks: string[] = [];
    for await (const chunk of chatStream) {
      chunks.push(chunk);
    }

    // Should stop after d: line, not yield "part2"
    expect(chunks).toEqual(['part1']);
  });

  it('text() returns concatenated result', async () => {
    const response = makeStreamResponse([
      '0:"Hello"',
      '0:" world"',
      '0:"!"',
      'd:{}',
    ]);

    const chatStream = new ChatStream(response);
    const text = await chatStream.text();

    expect(text).toBe('Hello world!');
  });

  it('messageId comes from response header', () => {
    const response = makeStreamResponse([], {
      'x-message-id': 'msg_abc123',
    });

    const chatStream = new ChatStream(response);
    expect(chatStream.messageId).toBe('msg_abc123');
  });

  it('messageId is undefined when header is missing', () => {
    const response = makeStreamResponse([]);
    const chatStream = new ChatStream(response);
    expect(chatStream.messageId).toBeUndefined();
  });
});
