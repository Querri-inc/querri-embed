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
    instance.destroy();
  });

  it('share key mode with startView: iframe src includes startView param', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk-123', org: 'org-456' },
      startView: '/builder/dashboard/abc',
    });
    expect(instance.iframe!.src).toContain('&startView=%2Fbuilder%2Fdashboard%2Fabc');
    instance.destroy();
  });

  it('fetchSessionToken mode: iframe src is /embed without share params', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { fetchSessionToken: async () => 'token-123' },
    });
    expect(instance.iframe!.src).toBe(SERVER_URL + '/embed');
    instance.destroy();
  });

  it('login mode: iframe src is /embed', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: 'login',
    });
    expect(instance.iframe!.src).toBe(SERVER_URL + '/embed');
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

  it('emits timeout error after 15s if no ready message', () => {
    const instance = QuerriEmbed.create(container, {
      serverUrl: SERVER_URL,
      auth: { shareKey: 'sk', org: 'org' },
    });
    const errorCb = vi.fn();
    instance.on('error', errorCb);

    vi.advanceTimersByTime(15000);

    expect(errorCb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'timeout' })
    );
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
  it('exposes a version string', () => {
    expect(typeof QuerriEmbed.version).toBe('string');
    expect(QuerriEmbed.version).toBe('0.1.0');
  });
});
