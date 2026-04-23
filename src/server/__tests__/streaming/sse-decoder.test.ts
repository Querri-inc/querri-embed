import { decodeSSE, type SSEEvent } from '../../streaming/sse-decoder.js';

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  for await (const ev of decodeSSE(stream)) events.push(ev);
  return events;
}

describe('decodeSSE', () => {
  it('parses a simple data event', async () => {
    const events = await collect(streamFromChunks(['data: hello\n\n']));
    expect(events).toEqual([{ data: 'hello' }]);
  });

  it('accepts data field with and without the space after the colon', async () => {
    const events = await collect(
      streamFromChunks(['data: spaced\n\n', 'data:tight\n\n']),
    );
    expect(events).toEqual([{ data: 'spaced' }, { data: 'tight' }]);
  });

  it('captures event, id, and retry alongside data', async () => {
    const events = await collect(
      streamFromChunks([
        'event: message\nid: 42\nretry: 3000\ndata: payload\n\n',
      ]),
    );
    expect(events).toEqual([
      { event: 'message', id: '42', retry: 3000, data: 'payload' },
    ]);
  });

  it('concatenates multiple data lines into a single event', async () => {
    const events = await collect(
      streamFromChunks(['data: part1\ndata: part2\n\n']),
    );
    expect(events).toEqual([{ data: 'part1part2' }]);
  });

  it('ignores lines starting with a colon as comments', async () => {
    const events = await collect(
      streamFromChunks([':heartbeat\ndata: after-comment\n\n']),
    );
    expect(events).toEqual([{ data: 'after-comment' }]);
  });

  it('reassembles an event whose lines span chunk boundaries', async () => {
    // 'event: msg\ndata: hello\n\n' delivered in fragments that split both
    // fields (mid-field name and mid-value).
    const events = await collect(
      streamFromChunks(['eve', 'nt: msg\nda', 'ta: hel', 'lo\n\n']),
    );
    expect(events).toEqual([{ event: 'msg', data: 'hello' }]);
  });

  it('reassembles an event when its terminating blank line arrives in a later chunk', async () => {
    const events = await collect(
      streamFromChunks(['data: hello\n', '\n']),
    );
    expect(events).toEqual([{ data: 'hello' }]);
  });

  it('flushes a dangling event that never receives a terminating blank line', async () => {
    // Final event has no trailing \n\n — decoder should still yield it,
    // preserving event/id/retry (not just data) — the latent flush bug.
    const events = await collect(
      streamFromChunks(['event: last\nid: 9\ndata: tail']),
    );
    expect(events).toEqual([{ event: 'last', id: '9', data: 'tail' }]);
  });

  it('emits multiple events separated by blank lines', async () => {
    const events = await collect(
      streamFromChunks(['data: one\n\ndata: two\n\ndata: three\n\n']),
    );
    expect(events).toEqual([
      { data: 'one' },
      { data: 'two' },
      { data: 'three' },
    ]);
  });

  it('skips blank separators that have no data field', async () => {
    // A lone blank line with no preceding data should not yield an empty event.
    const events = await collect(streamFromChunks(['\n\ndata: only\n\n']));
    expect(events).toEqual([{ data: 'only' }]);
  });
});
