export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

export async function* decodeSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      let currentEvent: Partial<SSEEvent> = {};
      for (const line of lines) {
        if (line === '') {
          if (currentEvent.data !== undefined) {
            yield currentEvent as SSEEvent;
          }
          currentEvent = {};
        } else if (line.startsWith('data: ')) {
          currentEvent.data = (currentEvent.data ?? '') + line.slice(6);
        } else if (line.startsWith('data:')) {
          currentEvent.data = (currentEvent.data ?? '') + line.slice(5);
        } else if (line.startsWith('event: ')) {
          currentEvent.event = line.slice(7);
        } else if (line.startsWith('event:')) {
          currentEvent.event = line.slice(6);
        } else if (line.startsWith('id: ')) {
          currentEvent.id = line.slice(4);
        } else if (line.startsWith('id:')) {
          currentEvent.id = line.slice(3);
        } else if (line.startsWith('retry: ')) {
          currentEvent.retry = parseInt(line.slice(7), 10);
        } else if (line.startsWith('retry:')) {
          currentEvent.retry = parseInt(line.slice(6), 10);
        }
        // Lines starting with ':' are comments, ignored
      }
    }

    // Flush any remaining event in the buffer
    if (buffer.trim() !== '') {
      const lines = buffer.split('\n');
      let currentEvent: Partial<SSEEvent> = {};
      for (const line of lines) {
        if (line === '') {
          if (currentEvent.data !== undefined) {
            yield currentEvent as SSEEvent;
          }
          currentEvent = {};
        } else if (line.startsWith('data: ')) {
          currentEvent.data = (currentEvent.data ?? '') + line.slice(6);
        } else if (line.startsWith('data:')) {
          currentEvent.data = (currentEvent.data ?? '') + line.slice(5);
        }
      }
      if (currentEvent.data !== undefined) {
        yield currentEvent as SSEEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
