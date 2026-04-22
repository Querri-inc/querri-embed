import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { QuerriEmbed, type QuerriEmbedRef } from './index.js';

// Mock the core SDK
const mockInstance = {
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
  iframe: document.createElement('iframe'),
  ready: false,
};

vi.mock('../core/querri-embed.js', () => ({
  QuerriEmbed: {
    create: vi.fn(() => ({ ...mockInstance, on: vi.fn().mockReturnThis() })),
    version: '0.0.0-test',
  },
}));

import { QuerriEmbed as SDK } from '../core/querri-embed.js';

const SERVER_URL = 'https://app.querri.com';
const AUTH = { shareKey: 'sk-123', org: 'org-456' };

describe('React QuerriEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return a fresh instance each time
    (SDK.create as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const inst = {
        on: vi.fn().mockReturnThis(),
        off: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        iframe: document.createElement('iframe'),
        ready: false,
      };
      return inst;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a div in the DOM', () => {
    const { container } = render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} />
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('calls SDK.create with correct options', () => {
    render(
      <QuerriEmbed
        serverUrl={SERVER_URL}
        auth={AUTH}
        startView="/builder/dashboard/abc"
        chrome={{ sidebar: { show: false } }}
        theme={{ color: 'blue' }}
      />
    );

    expect(SDK.create).toHaveBeenCalledTimes(1);
    const [container, options] = (SDK.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(options).toEqual({
      serverUrl: SERVER_URL,
      auth: AUTH,
      startView: '/builder/dashboard/abc',
      chrome: { sidebar: { show: false } },
      theme: { color: 'blue' },
    });
  });

  it('calls instance.destroy on unmount', () => {
    const { unmount } = render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} />
    );

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('exposes instance and iframe via ref', () => {
    const ref = createRef<QuerriEmbedRef>();
    render(
      <QuerriEmbed ref={ref} serverUrl={SERVER_URL} auth={AUTH} />
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current!.instance).not.toBeNull();
    expect(ref.current!.iframe).toBeInstanceOf(HTMLIFrameElement);
  });

  it('registers event handlers via SDK.on()', () => {
    const onReady = vi.fn();
    const onError = vi.fn();

    render(
      <QuerriEmbed
        serverUrl={SERVER_URL}
        auth={AUTH}
        onReady={onReady}
        onError={onError}
      />
    );

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    // Verify on() was called for ready and error events
    const onCalls = instance.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(onCalls).toContain('ready');
    expect(onCalls).toContain('error');
    expect(onCalls).toContain('session-expired');
    expect(onCalls).toContain('navigation');
  });

  it('fires onReady callback when SDK emits ready', () => {
    const onReady = vi.fn();

    render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} onReady={onReady} />
    );

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    // Find the ready handler and call it
    const readyCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'ready');
    expect(readyCall).toBeDefined();
    readyCall![1](); // invoke the handler
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('fires onError callback when SDK emits error', () => {
    const onError = vi.fn();

    render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} onError={onError} />
    );

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const errorCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'error');
    expect(errorCall).toBeDefined();
    errorCall![1]({ code: 'test', message: 'test error' });
    expect(onError).toHaveBeenCalledWith({ code: 'test', message: 'test error' });
  });

  it('recreates instance when serverUrl changes', () => {
    const { rerender } = render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} />
    );

    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(SDK.create).toHaveBeenCalledTimes(1);

    rerender(
      <QuerriEmbed serverUrl="https://other.querri.com" auth={AUTH} />
    );

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);
  });

  it('passes timeout prop through to SDK.create', () => {
    render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={AUTH} timeout={5000} />
    );

    const [, options] = (SDK.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.timeout).toBe(5000);
  });

  it('does not recreate instance when auth object has same content but new reference', () => {
    const { rerender } = render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={{ shareKey: 'sk-123', org: 'org-456' }} />
    );

    expect(SDK.create).toHaveBeenCalledTimes(1);

    // Re-render with a new object that has the same content
    rerender(
      <QuerriEmbed serverUrl={SERVER_URL} auth={{ shareKey: 'sk-123', org: 'org-456' }} />
    );

    // Should NOT recreate — same content, different reference
    expect(SDK.create).toHaveBeenCalledTimes(1);
  });

  it('recreates instance when auth content actually changes', () => {
    const { rerender } = render(
      <QuerriEmbed serverUrl={SERVER_URL} auth={{ shareKey: 'sk-123', org: 'org-456' }} />
    );

    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(SDK.create).toHaveBeenCalledTimes(1);

    rerender(
      <QuerriEmbed serverUrl={SERVER_URL} auth={{ shareKey: 'sk-NEW', org: 'org-456' }} />
    );

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);
  });

  it('does not recreate instance when chrome/theme objects have same content but new reference', () => {
    const { rerender } = render(
      <QuerriEmbed
        serverUrl={SERVER_URL}
        auth={AUTH}
        chrome={{ sidebar: { show: false } }}
        theme={{ color: 'blue' }}
      />
    );

    expect(SDK.create).toHaveBeenCalledTimes(1);

    rerender(
      <QuerriEmbed
        serverUrl={SERVER_URL}
        auth={AUTH}
        chrome={{ sidebar: { show: false } }}
        theme={{ color: 'blue' }}
      />
    );

    expect(SDK.create).toHaveBeenCalledTimes(1);
  });
});
