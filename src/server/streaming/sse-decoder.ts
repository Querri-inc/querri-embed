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
  // Persisted across chunks so a single event whose lines straddle chunk
  // boundaries (or whose terminating blank line arrives in a later chunk)
  // is not dropped.
  let currentEvent: Partial<SSEEvent> = {};

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line === '') {
          if (currentEvent.data !== undefined) {
            yield currentEvent as SSEEvent;
          }
          currentEvent = {};
        } else {
          appendLine(currentEvent, line);
        }
      }
    }

    // The trailing buffer is whatever came after the last '\n' — a partial
    // final line. Parse it as if complete and yield any dangling event so
    // streams that never end with a blank line still deliver their last event.
    if (buffer !== '') {
      appendLine(currentEvent, buffer);
    }
    if (currentEvent.data !== undefined) {
      yield currentEvent as SSEEvent;
    }
  } finally {
    reader.releaseLock();
  }
}

function appendLine(event: Partial<SSEEvent>, line: string): void {
  const colonIdx = line.indexOf(':');
  // Per SSE spec: leading ':' is a comment, and a field without ':' has an
  // empty value. In either case there's nothing useful to append.
  if (colonIdx <= 0) return;

  const field = line.slice(0, colonIdx);
  const value = line[colonIdx + 1] === ' '
    ? line.slice(colonIdx + 2)
    : line.slice(colonIdx + 1);

  switch (field) {
    case 'data':
      event.data = (event.data ?? '') + value;
      break;
    case 'event':
      event.event = value;
      break;
    case 'id':
      event.id = value;
      break;
    case 'retry':
      event.retry = parseInt(value, 10);
      break;
  }
}
