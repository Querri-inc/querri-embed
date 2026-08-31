import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuerriEmbed } from './querri-embed.js';

const SERVER_URL = 'https://app.querri.com';
const ORIGIN = 'https://app.querri.com';

function createContainer(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'test-container';
  document.body.appendChild(el);
  return el;
}

function sendMessage(type: string, extra: Record<string, unknown> = {}) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type, ...extra },
      origin: ORIGIN,
    })
  );
}

describe('QuerriEmbed.create() validation', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('throws when serverUrl is missing', () => {
    expect(() => QuerriEmbed.create(container, { auth: 'login' } as any)).toThrow(
      'serverUrl is required'
    );
  });

  it('throws when auth is missing', () => {
    expect(() =>
      QuerriEmbed.create(container, { serverUrl: SERVER_URL } as any)
    ).toThrow('auth is required');
  });

  it('throws when selector does not match any element', () => {
    expect(() =>
      QuerriEmbed.create('#nonexistent', { serverUrl: SERVER_URL, auth: 'login' })
    ).toThrow('element not found');
  });

  it('throws when container is not a string or HTMLElement', () => {
    expect(() =>
      QuerriEmbed.create(42 as any, { serverUrl: SERVER_URL, auth: 'login' })
    ).toThrow('invalid container');
  });

  it('accepts a CSS selector string', () => {
    const instance = QuerriEmbed.create('#test-container', {
      serverUrl: SERVER_URL,
      auth: 'login',
    });
    expect(instance.iframe).not.toBeNull();
    instance.destroy();
  });

  it('accepts an HTMLElement directly', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: 'login',
    });
    expect(instance.iframe).not.toBeNull();
    instance.destroy();
  });
});

describe('Auth mode routing', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('share key mode: iframe src includes share and org params', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk-123', org: 'org-456' },
    });
    expect(instance.iframe!.src).toContain('/embed?share=sk-123&org=org-456');
    // No forced startView: unset means the runtime's own default view.
    expect(instance.iframe!.src).not.toContain('startView=');
    // The parent declares itself in the URL so the runtime can pin its trust
    // anchor before anyone speaks to it.
    expect(instance.iframe!.src).toContain('parentOrigin=');
    instance.destroy();
  });

  it('share key mode with startView: iframe src includes startView param', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk-123', org: 'org-456' },
      startView: '/dashboard/abc',
    });
    expect(instance.iframe!.src).toContain('&startView=%2Fdashboard%2Fabc');
    instance.destroy();
  });

  it('fetchSessionToken mode: iframe src is /embed without share params', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: async () => 'token-123' },
    });
    expect(instance.iframe!.src).toBe(
      SERVER_URL + '/embed?parentOrigin=' + encodeURIComponent(window.location.origin)
    );
    instance.destroy();
  });

  it('login mode: iframe src is /embed', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: 'login',
    });
    expect(instance.iframe!.src).toBe(
      SERVER_URL + '/embed?parentOrigin=' + encodeURIComponent(window.location.origin)
    );
    instance.destroy();
  });

  it('invalid auth: emits error with invalid_auth code', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { bad: true } as any,
    });
    const errorHandler = vi.fn();
    instance.on('error', errorHandler);

    // Error is deferred with setTimeout(0) so handlers can be attached after create()
    vi.advanceTimersByTime(1);

    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_auth' })
    );
    expect(instance.iframe).toBeNull();
    instance.destroy();
  });
});

describe('Event emitter', () => {
  let container: HTMLDivElement;
  let instance: ReturnType<typeof QuerriEmbed.create>;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
  });

  afterEach(() => {
    instance.destroy();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('on() registers callback and event fires it', () => {
    const cb = vi.fn();
    instance.on('ready', cb);
    sendMessage('authenticated');
    expect(cb).toHaveBeenCalledWith({});
  });

  it('on() is chainable', () => {
    const result = instance.on('ready', () => {});
    expect(result).toBe(instance);
  });

  it('off() removes a specific callback', () => {
    const cb = vi.fn();
    instance.on('error', cb);
    instance.off('error', cb);
    sendMessage('error', { code: 'test', message: 'test' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('error in handler does not crash emit', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = () => {
      throw new Error('handler error');
    };
    const goodHandler = vi.fn();

    instance.on('ready', badHandler);
    instance.on('ready', goodHandler);
    sendMessage('authenticated');

    expect(goodHandler).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('PostMessage state machine', () => {
  let container: HTMLDivElement;
  let instance: ReturnType<typeof QuerriEmbed.create>;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    instance?.destroy();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('authenticated message sets ready and emits ready event', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('ready', cb);

    sendMessage('authenticated');

    expect(instance.ready).toBe(true);
    expect(cb).toHaveBeenCalledWith({});
  });

  it('authenticated message removes loader from DOM', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    // Container should have iframe + loader div before authenticated
    const childrenBefore = container.children.length;
    expect(childrenBefore).toBeGreaterThan(1); // iframe + loader

    sendMessage('authenticated');

    // Loader should be removed — only iframe remains
    const childrenAfter = container.children.length;
    expect(childrenAfter).toBeLessThan(childrenBefore);
  });

  it('error message re-emits as error event', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('error', cb);

    sendMessage('error', { code: 'test_error', message: 'something went wrong' });

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'test_error', message: 'something went wrong' })
    );
  });

  it('navigation message re-emits as navigation event', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('navigation', cb);

    sendMessage('navigation', { path: '/dashboard/123' });

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'navigation', path: '/dashboard/123' })
    );
  });

  it('session-expired message sets ready=false and emits event', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();

    // First authenticate
    sendMessage('authenticated');
    expect(instance.ready).toBe(true);

    instance.on('session-expired', cb);
    sendMessage('session-expired');

    expect(instance.ready).toBe(false);
    expect(cb).toHaveBeenCalledWith({});
  });

  it('ignores messages from wrong origin', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('ready', cb);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'authenticated' },
        origin: 'https://evil.com',
      })
    );

    expect(cb).not.toHaveBeenCalled();
    expect(instance.ready).toBe(false);
  });

  it('ignores messages with no type', () => {
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('ready', cb);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { foo: 'bar' },
        origin: ORIGIN,
      })
    );

    expect(cb).not.toHaveBeenCalled();
  });
});

describe('destroy() cleanup', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('removes iframe from DOM', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    expect(container.querySelector('iframe')).not.toBeNull();

    instance.destroy();

    expect(container.querySelector('iframe')).toBeNull();
    expect(instance.iframe).toBeNull();
  });

  it('sets ready to false', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');
    expect(instance.ready).toBe(true);

    instance.destroy();

    expect(instance.ready).toBe(false);
  });

  it('stops responding to messages after destroy', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const cb = vi.fn();
    instance.on('ready', cb);

    instance.destroy();
    sendMessage('authenticated');

    expect(cb).not.toHaveBeenCalled();
  });

  it('double destroy is safe (idempotent)', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    expect(() => {
      instance.destroy();
      instance.destroy();
    }).not.toThrow();
  });
});

describe('Ready timeout', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('emits a RECOVERABLE timeout error after 30s if no ready message', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(30000);

    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'timeout', recoverable: true })
    );
    instance.destroy();
  });

  it('emits recovered when ready arrives after the timeout fired', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const recoveredCb = vi.fn();
    instance.on('recovered', recoveredCb);

    vi.advanceTimersByTime(35000);
    sendMessage('ready');

    expect(recoveredCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'timeout', afterMs: expect.any(Number) })
    );
    instance.destroy();
  });

  it('readyTimeout: 0 disables the warning entirely', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      readyTimeout: 0,
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(120000);

    expect(errorCb).not.toHaveBeenCalled();
    instance.destroy();
  });

  it('clears timeout when ready message received', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    // Simulate the iframe sending 'ready'
    sendMessage('ready');

    // Advance past 15s
    vi.advanceTimersByTime(20000);

    expect(errorCb).not.toHaveBeenCalled();
    instance.destroy();
  });

  it('does not emit timeout error after destroy', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    instance.destroy();
    vi.advanceTimersByTime(15000);

    expect(errorCb).not.toHaveBeenCalled();
  });
});

describe('Container setup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('sets position to relative when container has static positioning', () => {
    const container = createContainer();
    // Default position in happy-dom is '' or 'static'
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    expect(container.style.position).toBe('relative');
    instance.destroy();
  });
});

describe('QuerriEmbed.version', () => {
  it('exposes a semver version string', () => {
    expect(typeof QuerriEmbed.version).toBe('string');
    expect(QuerriEmbed.version).toMatch(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
  });
});

// ─── New DX improvement tests ──────────────────────────────

describe('DevTools warnings', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('warns when container has zero dimensions', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = createContainer();
    // happy-dom gives 0x0 by default (no layout engine)
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    // Warning is deferred to next animation frame
    await vi.advanceTimersByTimeAsync(16);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('container has zero')
    );
    instance.destroy();
    warnSpy.mockRestore();
  });

  it('warns when serverUrl does not look like a URL', () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = createContainer();
    const instance = QuerriEmbed.create(container, {
      serverUrl: 'not-a-url',
      auth: { shareKey: 'sk', org: 'org' },
    });
    const urlWarnings = warnSpy.mock.calls.filter(
      (call) => String(call[0]).includes("doesn't look like a URL")
    );
    expect(urlWarnings).toHaveLength(1);
    instance.destroy();
    warnSpy.mockRestore();
  });

  it('does not warn when serverUrl is valid https', () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = createContainer();
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const urlWarnings = warnSpy.mock.calls.filter(
      (call) => String(call[0]).includes("doesn't look like a URL")
    );
    expect(urlWarnings).toHaveLength(0);
    instance.destroy();
    warnSpy.mockRestore();
  });

  it('warns when container already has a querri iframe', () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = createContainer();
    const instance1 = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const instance2 = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const dupeWarnings = warnSpy.mock.calls.filter(
      (call) => String(call[0]).includes('already has a QuerriEmbed iframe')
    );
    expect(dupeWarnings).toHaveLength(1);
    instance1.destroy();
    instance2.destroy();
    warnSpy.mockRestore();
  });
});

describe('Configurable timeout', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('uses the 30s default when neither readyTimeout nor timeout is set', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(29999);
    expect(errorCb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'timeout' })
    );
    instance.destroy();
  });

  it('readyTimeout wins over the deprecated timeout alias', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      readyTimeout: 8000,
      timeout: 5000,
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(5000);
    expect(errorCb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(errorCb).toHaveBeenCalledWith(expect.objectContaining({ code: 'timeout' }));
    instance.destroy();
  });

  it('uses custom timeout value', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      timeout: 5000,
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(4999);
    expect(errorCb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'timeout' })
    );
    instance.destroy();
  });

  it('timeout error message includes the configured duration', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      timeout: 5000,
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(5000);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('5000ms') })
    );
    instance.destroy();
  });
});

describe('Token fetch retry', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('retries after first failure with 1s delay', async () => {
    let callCount = 0;
    const fetchToken = vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('network error'));
      return Promise.resolve('token-ok');
    });

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchToken).toHaveBeenCalledTimes(2);
    instance.destroy();
  });

  it('emits error after 3 failed attempts', async () => {
    const fetchToken = vi.fn(() => Promise.reject(new Error('network error')));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0); // 1st attempt fails
    await vi.advanceTimersByTimeAsync(1000); // retry after 1s
    await vi.advanceTimersByTimeAsync(0); // 2nd attempt fails
    await vi.advanceTimersByTimeAsync(2000); // retry after 2s
    await vi.advanceTimersByTimeAsync(0); // 3rd attempt fails

    expect(fetchToken).toHaveBeenCalledTimes(3);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'token_fetch_failed',
        message: expect.stringContaining('3 attempts'),
      })
    );
    instance.destroy();
  });

  it('destroy during retry aborts further attempts', async () => {
    const fetchToken = vi.fn(() => Promise.reject(new Error('fail')));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);

    instance.destroy();

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchToken).toHaveBeenCalledTimes(1);
  });

  it('emits error when fetchSessionToken resolves with undefined', async () => {
    const fetchToken = vi.fn(() => Promise.resolve(undefined as any));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0); // 1st attempt — returns undefined
    await vi.advanceTimersByTimeAsync(1000); // retry after 1s
    await vi.advanceTimersByTimeAsync(0); // 2nd attempt
    await vi.advanceTimersByTimeAsync(2000); // retry after 2s
    await vi.advanceTimersByTimeAsync(0); // 3rd attempt

    expect(fetchToken).toHaveBeenCalledTimes(3);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'token_fetch_failed',
        message: expect.stringContaining('non-empty string'),
      })
    );
    instance.destroy();
  });

  it('emits error when fetchSessionToken resolves with empty string', async () => {
    const fetchToken = vi.fn(() => Promise.resolve(''));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchToken).toHaveBeenCalledTimes(3);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'token_fetch_failed',
      })
    );
    instance.destroy();
  });
});

describe('Token fetch deduplication', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('ignores duplicate auth-required while fetch is in flight', async () => {
    let resolveFn: (v: string) => void;
    const fetchToken = vi.fn(() => new Promise<string>((resolve) => {
      resolveFn = resolve;
    }));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1);

    // auth-required while fetch is still pending
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1); // NOT called again

    resolveFn!('token-123');
    await vi.advanceTimersByTimeAsync(0);
    instance.destroy();
  });

  it('allows new fetch after previous fetch completes', async () => {
    let callCount = 0;
    const fetchToken = vi.fn(() => {
      callCount++;
      return Promise.resolve('token-' + callCount);
    });

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1);

    // After first fetch resolves, session-expired should trigger new fetch
    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(2);
    instance.destroy();
  });

  it('only sends startView in the first init; subsequent re-inits omit it', async () => {
    // Regression: previously _buildConfig always defaulted startView to
    // '/home', which meant that every session-expired / auth-required
    // re-fetch yanked the user back to /home regardless of where they had
    // navigated inside the embed.
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    // Initial handshake: iframe ready -> SDK fetches token -> sends init
    // with startView so the iframe knows where to navigate.
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const firstInit = sendSpy.mock.calls[0][0] as { type: string; config: Record<string, unknown> };
    expect(firstInit.type).toBe('init');
    // Unset startView is sent as null — the runtime's own default view (the
    // home launcher), matching the served asset's behavior.
    expect(firstInit.config).toHaveProperty('startView', null);
    expect(firstInit.config).toHaveProperty('schemaVersion', 2);

    // Iframe confirms auth -> user is now navigating within the embed.
    sendMessage('authenticated');

    // Session expires later -> SDK refreshes token and re-sends init. This
    // second init must NOT carry startView; otherwise the iframe would
    // redirect the user back to startView every time the token refreshes.
    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    const secondInit = sendSpy.mock.calls[1][0] as { type: string; config: Record<string, unknown> };
    expect(secondInit.type).toBe('init');
    expect(secondInit.config).not.toHaveProperty('startView');

    instance.destroy();
  });

  it('honors an explicit startView on the first init and then omits it on refresh', async () => {
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
      startView: '/dashboard/abc',
    });

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    const firstInit = sendSpy.mock.calls[0][0] as { config: Record<string, unknown> };
    expect(firstInit.config).toHaveProperty('startView', '/dashboard/abc');

    sendMessage('authenticated');
    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0);
    const secondInit = sendSpy.mock.calls[1][0] as { config: Record<string, unknown> };
    expect(secondInit.config).not.toHaveProperty('startView');

    instance.destroy();
  });

  it('passes chrome through untouched — no wire-side alias rewriting', async () => {
    // The old _normalizeChrome shim duplicated fasterAnalysis onto
    // experimentalV2 on the wire. The runtime aliases legacy keys itself
    // (one-way, per layer), and duplicating created a three-way collision on
    // the same v2 leaf — so the SDK now sends exactly what the caller wrote.
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
      chrome: { chat: { fasterAnalysis: true } },
    });

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    const firstInit = sendSpy.mock.calls[0][0] as {
      config: { chrome: { chat: Record<string, unknown> } };
    };
    expect(firstInit.config.chrome.chat.fasterAnalysis).toBe(true);
    expect(firstInit.config.chrome.chat).not.toHaveProperty('experimentalV2');

    instance.destroy();
  });

  it('does not add experimentalV2 alias when fasterAnalysis is unset', async () => {
    // Sanity check: the shim is gated on fasterAnalysis being defined,
    // so a caller using the legacy key alone must still see only the
    // legacy key on the wire (no accidental injection of fasterAnalysis).
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
      chrome: { chat: { experimentalV2: true } },
    });

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    const firstInit = sendSpy.mock.calls[0][0] as {
      config: { chrome: { chat: Record<string, unknown> } };
    };
    expect(firstInit.config.chrome.chat.experimentalV2).toBe(true);
    expect(firstInit.config.chrome.chat).not.toHaveProperty('fasterAnalysis');

    instance.destroy();
  });
});

describe('Token fetch cycle circuit breaker', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('emits token_fetch_exhausted after 3 auth-required re-fetch cycles', async () => {
    const fetchToken = vi.fn(() => Promise.resolve('bad-token'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    // Cycle 1: iframe ready triggers initial fetch
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1);

    // iframe rejects the token -> auth-required -> cycle 2
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(2);

    // iframe rejects again -> auth-required -> cycle 3
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(3);

    // iframe rejects again -> auth-required -> circuit breaker trips
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(3); // NOT called a 4th time

    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'token_fetch_exhausted',
        message: expect.stringContaining('3 fetch cycles'),
      })
    );
    instance.destroy();
  });

  it('resets cycle count after successful authentication', async () => {
    let callCount = 0;
    const fetchToken = vi.fn(() => {
      callCount++;
      return Promise.resolve('token-' + callCount);
    });

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    // Cycle 1
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(1);

    // iframe rejects -> cycle 2
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(2);

    // This time iframe accepts -> authenticated resets counter
    sendMessage('authenticated');

    // Later, session expires -> new cycle 1 (counter was reset)
    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(3);

    // iframe rejects -> new cycle 2
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(4);

    // iframe rejects -> new cycle 3
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchToken).toHaveBeenCalledTimes(5);

    // No exhausted error should have been emitted
    expect(errorCb).not.toHaveBeenCalled();
    instance.destroy();
  });

  it('trips after 3 cycles where each cycle exhausts all retries', async () => {
    const fetchToken = vi.fn(() => Promise.reject(new Error('network error')));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    // Cycle 1: 3 retries with backoff
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);       // attempt 1
    await vi.advanceTimersByTimeAsync(1000);     // backoff -> attempt 2
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);     // backoff -> attempt 3
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchToken).toHaveBeenCalledTimes(3);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'token_fetch_failed' })
    );
    errorCb.mockClear();

    // auth-required triggers cycle 2
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchToken).toHaveBeenCalledTimes(6);
    errorCb.mockClear();

    // auth-required triggers cycle 3
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchToken).toHaveBeenCalledTimes(9);
    errorCb.mockClear();

    // auth-required -> cycle 4 attempt -> circuit breaker trips
    sendMessage('auth-required');
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchToken).toHaveBeenCalledTimes(9); // no more calls
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'token_fetch_exhausted' })
    );
    instance.destroy();
  });

  it('session-expired also respects the circuit breaker', async () => {
    const fetchToken = vi.fn(() => Promise.resolve('bad-token'));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0); // cycle 1

    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0); // cycle 2

    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0); // cycle 3

    sendMessage('session-expired');
    await vi.advanceTimersByTimeAsync(0); // cycle 4 -> blocked

    expect(fetchToken).toHaveBeenCalledTimes(3);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'token_fetch_exhausted' })
    );
    instance.destroy();
  });
});

describe('SSR guard', () => {
  it('throws descriptive error when document is undefined', () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error -- simulating SSR
    delete globalThis.document;

    try {
      expect(() =>
        QuerriEmbed.create('#container', {
          serverUrl: SERVER_URL,
          auth: 'login',
        })
      ).toThrow('requires a browser environment');
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

describe('Auth parameter validation', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('emits invalid_auth error when fetchSessionToken is not a function', async () => {
    const errorCb = vi.fn();
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: 'not-a-function' } as any,
    });
    instance.on('error', errorCb);
    await vi.advanceTimersByTimeAsync(0);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'invalid_auth',
        message: expect.stringContaining('must be a function'),
      })
    );
    instance.destroy();
  });

  it('emits invalid_auth error when shareKey is empty string', async () => {
    const errorCb = vi.fn();
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: '', org: 'org-123' } as any,
    });
    instance.on('error', errorCb);
    await vi.advanceTimersByTimeAsync(0);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'invalid_auth',
        message: expect.stringContaining('non-empty string'),
      })
    );
    instance.destroy();
  });

  it('emits invalid_auth error when shareKey is provided without org', async () => {
    const errorCb = vi.fn();
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk-123' } as any,
    });
    instance.on('error', errorCb);
    await vi.advanceTimersByTimeAsync(0);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'invalid_auth',
        message: expect.stringContaining('org is required'),
      })
    );
    instance.destroy();
  });

  it('does not throw for valid auth configs', () => {
    expect(() => {
      const inst = QuerriEmbed.create(container, {
        serverUrl: SERVER_URL,
        auth: { shareKey: 'sk-123', org: 'org-123' },
      });
      inst.destroy();
    }).not.toThrow();
  });
});

describe('Event emitter edge cases', () => {
  let container: HTMLDivElement;
  let instance: ReturnType<typeof QuerriEmbed.create>;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
    instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
  });

  afterEach(() => {
    instance.destroy();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('same listener added twice fires callback twice', () => {
    const cb = vi.fn();
    instance.on('ready', cb);
    instance.on('ready', cb);
    sendMessage('authenticated');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('off() stops matching callback from firing', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    instance.on('ready', cb1);
    instance.on('ready', cb2);
    instance.off('ready', cb1);
    sendMessage('authenticated');
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

describe('Destroy during pending fetch token', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('does not emit error after destroy', async () => {
    let rejectFn: (err: Error) => void;
    const fetchToken = vi.fn(() => new Promise<string>((_, reject) => {
      rejectFn = reject;
    }));

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);

    // Destroy while fetch is pending
    instance.destroy();

    // Reject the pending fetch
    rejectFn!(new Error('fail'));
    await vi.advanceTimersByTimeAsync(0);

    // Error should not be emitted because instance is destroyed
    expect(errorCb).not.toHaveBeenCalled();
  });
});

describe('serverUrl trailing slash handling', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('does not produce double slash in iframe src', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL + '/',
      auth: { shareKey: 'sk', org: 'org' },
    });

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    // Should not contain "//embed" (double slash before embed)
    expect(iframe!.src).not.toContain('//embed');
    instance.destroy();
  });
});

describe('sessionEndpoint auth mode', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('creates iframe with /embed src (same as fetchSessionToken mode)', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { sessionEndpoint: '/api/querri-session' } as any,
    });
    expect(instance.iframe!.src).toBe(
      SERVER_URL + '/embed?parentOrigin=' + encodeURIComponent(window.location.origin)
    );
    instance.destroy();
  });

  it('POSTs to sessionEndpoint when iframe sends ready', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session_token: 'tok_from_endpoint' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { sessionEndpoint: '/api/querri-session' } as any,
    });

    // Simulate iframe saying it's ready — triggers the internal fetchSessionToken
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledWith('/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    vi.unstubAllGlobals();
    instance.destroy();
  });

  it('emits invalid_auth error on empty sessionEndpoint string', async () => {
    const errorCb = vi.fn();
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { sessionEndpoint: '' } as any,
    });
    instance.on('error', errorCb);
    await vi.advanceTimersByTimeAsync(0);
    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'invalid_auth',
        message: expect.stringContaining('sessionEndpoint must be a non-empty string'),
      })
    );
    instance.destroy();
  });

  it('retries on non-ok response from endpoint', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Session endpoint returned 500'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session_token: 'tok_retry' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { sessionEndpoint: '/api/querri-session' } as any,
    });

    // Trigger fetch
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0); // 1st attempt fails
    await vi.advanceTimersByTimeAsync(1000); // retry after 1s
    await vi.advanceTimersByTimeAsync(0); // 2nd attempt fails
    await vi.advanceTimersByTimeAsync(2000); // retry after 2s
    await vi.advanceTimersByTimeAsync(0); // 3rd attempt succeeds

    expect(mockFetch).toHaveBeenCalledTimes(3);

    vi.unstubAllGlobals();
    instance.destroy();
  });
});

describe('sendPrompt', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('resolves { ok: false } when embed is not ready', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    // Not yet authenticated, so ready is false. A resolved refusal, not an
    // error event: the answer belongs to the caller who asked.
    const result = await instance.sendPrompt('hello');

    expect(result).toEqual({ ok: false, message: expect.stringContaining('not ready') });
    instance.destroy();
  });

  it('resolves { ok: false } for empty string', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    sendMessage('authenticated');
    const result = await instance.sendPrompt('');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('non-empty');
    instance.destroy();
  });

  it('resolves { ok: false } for whitespace-only string', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    sendMessage('authenticated');
    const result = await instance.sendPrompt('   ');

    expect(result.ok).toBe(false);
    instance.destroy();
  });

  it('resolves { ok: false } for non-string input', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    sendMessage('authenticated');
    const result = await instance.sendPrompt(42 as any);

    expect(result.ok).toBe(false);
    instance.destroy();
  });

  it('resolves with the runtime answer from send-prompt-result', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });

    sendMessage('authenticated');
    const pending = instance.sendPrompt('hello');
    sendMessage('send-prompt-result', { ok: true, message: 'Delivered' });

    await expect(pending).resolves.toEqual({ ok: true, message: 'Delivered' });
    instance.destroy();
  });

  it('resolves concurrent prompts in order (FIFO, no correlation id)', async () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');

    const first = instance.sendPrompt('one');
    const second = instance.sendPrompt('two');
    sendMessage('send-prompt-result', { ok: true, message: 'first answer' });
    sendMessage('send-prompt-result', { ok: false, message: 'second answer' });

    await expect(first).resolves.toEqual({ ok: true, message: 'first answer' });
    await expect(second).resolves.toEqual({ ok: false, message: 'second answer' });
    instance.destroy();
  });

  it('settles awaited prompts on destroy instead of stranding them', async () => {
    // A wrapper remount (serverUrl/auth/startView prop change) destroys the
    // instance while a caller may still be awaiting — the promise must settle.
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');

    const pending = instance.sendPrompt('hello');
    instance.destroy();

    await expect(pending).resolves.toEqual({
      ok: false,
      message: 'Embed destroyed before the prompt was delivered',
    });
  });

  it('sends postMessage to iframe when ready', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');
    instance.sendPrompt('hello world');

    expect(sendSpy).toHaveBeenCalledWith(
      { type: 'send-prompt', text: 'hello world', autoSubmit: false }
    );
    instance.destroy();
  });

  it('sends autoSubmit flag when specified', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');
    instance.sendPrompt('hello', { autoSubmit: true });

    expect(sendSpy).toHaveBeenCalledWith(
      { type: 'send-prompt', text: 'hello', autoSubmit: true }
    );
    instance.destroy();
  });

  it('defaults autoSubmit to false when options omitted', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    sendMessage('authenticated');

    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');
    instance.sendPrompt('hello');

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ autoSubmit: false })
    );
    instance.destroy();
  });

  it('forwards iframe error response through error event', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    sendMessage('authenticated');
    instance.sendPrompt('hello');

    // Simulate iframe responding with an error
    sendMessage('error', { code: 'send_prompt_failed', message: 'No prompt input available on the current view' });

    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'send_prompt_failed', message: 'No prompt input available on the current view' })
    );
    instance.destroy();
  });
});


describe('v2 protocol surface', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('updateConfig REPLACES the config and posts it once ready', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      chrome: { rail: { show: true } },
    });
    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    sendMessage('authenticated');
    instance.updateConfig({ chrome: { header: { show: false } } });

    const msg = sendSpy.mock.calls.find(
      (c: any[]) => (c[0] as { type: string }).type === 'updateConfig'
    )![0] as { config: { chrome: Record<string, unknown>; schemaVersion: number } };
    // Whole-object replacement: rail is GONE, not merged.
    expect(msg.config.chrome).toEqual({ header: { show: false } });
    expect(msg.config.schemaVersion).toBe(2);
    instance.destroy();
  });

  it('updateConfig before ready folds into the init that follows', async () => {
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
    });
    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    instance.updateConfig({ theme: { name: 'night' } });
    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);

    const init = sendSpy.mock.calls[0][0] as { type: string; config: { theme: unknown } };
    expect(init.type).toBe('init');
    expect(init.config.theme).toEqual({ name: 'night' });
    // No separate updateConfig was posted pre-ready.
    expect(sendSpy.mock.calls.filter((c: any[]) => (c[0] as any).type === 'updateConfig')).toHaveLength(0);
    instance.destroy();
  });

  it('surfaces config-applied as the config event', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const configCb = vi.fn();
    instance.on('config', configCb);

    sendMessage('config-applied', {
      schemaVersion: 2,
      changes: { dropped: [{ path: 'chat.bogus', reason: 'unknown key' }] },
    });

    expect(configCb).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 2 })
    );
    instance.destroy();
  });

  it('resize adjusts the iframe height under autoHeight, and always emits', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
      autoHeight: true,
    });
    const resizeCb = vi.fn();
    instance.on('resize', resizeCb);

    sendMessage('resize', { height: 640 });

    expect(instance.iframe!.style.height).toBe('640px');
    expect(resizeCb).toHaveBeenCalledWith(expect.objectContaining({ height: 640 }));
    instance.destroy();
  });

  it('passes chat lifecycle events through', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const chatCb = vi.fn();
    instance.on('chat', chatCb);

    sendMessage('chat', { phase: 'finished' });

    expect(chatCb).toHaveBeenCalledWith(expect.objectContaining({ phase: 'finished' }));
    instance.destroy();
  });

  it('sends privacy and locale in the config when set', async () => {
    const fetchToken = vi.fn(() => Promise.resolve('token-123'));
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: fetchToken },
      privacy: { errorReporting: false },
      locale: 'es',
    });
    const sendSpy = vi.spyOn(instance as any, '_sendToIframe');

    sendMessage('ready');
    await vi.advanceTimersByTimeAsync(0);

    const init = sendSpy.mock.calls[0][0] as { config: Record<string, unknown> };
    expect(init.config.privacy).toEqual({ errorReporting: false });
    expect(init.config.locale).toBe('es');
    instance.destroy();
  });
});
