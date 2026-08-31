import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { createClassComponent } from 'svelte/legacy';

// Mock the core SDK
vi.mock('../core/querri-embed.js', () => ({
  QuerriEmbed: {
    create: vi.fn(() => {
      const inst = {
        on: vi.fn().mockReturnThis(),
        off: vi.fn().mockReturnThis(),
        updateConfig: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        iframe: document.createElement('iframe'),
        ready: false,
      };
      return inst;
    }),
    version: '0.0.0-test',
  },
}));

import { QuerriEmbed as SDK } from '../core/querri-embed.js';
import QuerriEmbed from './QuerriEmbed.svelte';

const SERVER_URL = 'https://app.querri.com';
const AUTH = { shareKey: 'sk-123', org: 'org-456' };

function mountComponent(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  let component: ReturnType<typeof mount>;
  flushSync(() => {
    component = mount(QuerriEmbed, {
      target,
      props: { serverUrl: SERVER_URL, auth: AUTH, ...props },
    });
  });
  return component!;
}

describe('Svelte QuerriEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a div and calls SDK.create with all props', () => {
    const component = mountComponent({
      startView: '/builder/dashboard/abc',
      chrome: { sidebar: { show: false } },
      theme: { color: 'blue' },
      timeout: 5000,
    });

    expect(SDK.create).toHaveBeenCalledTimes(1);
    const [container, options] = (SDK.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(options).toEqual({
      serverUrl: SERVER_URL,
      auth: AUTH,
      startView: '/builder/dashboard/abc',
      chrome: { sidebar: { show: false } },
      theme: { color: 'blue' },
      timeout: 5000,
    });

    unmount(component);
  });

  it('calls instance.destroy on unmount', () => {
    const component = mountComponent();

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    unmount(component);
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('exposes getInstance and getIframe methods', () => {
    const component = mountComponent() as any;

    expect(typeof component.getInstance).toBe('function');
    expect(typeof component.getIframe).toBe('function');
    expect(component.getInstance()).not.toBeNull();
    expect(component.getIframe()).toBeInstanceOf(HTMLIFrameElement);

    unmount(component);
  });

  it('registers all eight event handlers', () => {
    const component = mountComponent();

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const onCalls = instance.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(onCalls).toContain('ready');
    expect(onCalls).toContain('error');
    expect(onCalls).toContain('session-expired');
    expect(onCalls).toContain('navigation');
    expect(onCalls).toContain('config');
    expect(onCalls).toContain('resize');
    expect(onCalls).toContain('chat');
    expect(onCalls).toContain('recovered');

    unmount(component);
  });

  // Prop-update tests drive the component through the legacy class API,
  // which is the supported way to $set props from outside in Svelte 5.
  function mountLegacy(props: Record<string, unknown> = {}) {
    const target = document.createElement('div');
    document.body.appendChild(target);
    let comp!: ReturnType<typeof createClassComponent>;
    flushSync(() => {
      comp = createClassComponent({
        component: QuerriEmbed,
        target,
        props: { serverUrl: SERVER_URL, auth: AUTH, ...props },
      });
    });
    return comp;
  }

  it('chrome change calls updateConfig (debounced) and does NOT destroy the iframe', () => {
    vi.useFakeTimers();
    try {
      const comp = mountLegacy({ chrome: { rail: { show: false } } });
      const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

      comp.$set({ chrome: { rail: { show: true } } });
      flushSync();

      // Not yet — debounced
      expect(instance.updateConfig).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);

      expect(instance.updateConfig).toHaveBeenCalledTimes(1);
      expect(instance.updateConfig).toHaveBeenCalledWith({
        chrome: { rail: { show: true } },
        theme: {},
        privacy: {},
        locale: '',
      });
      expect(instance.destroy).not.toHaveBeenCalled();
      expect(SDK.create).toHaveBeenCalledTimes(1);

      comp.$destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('startView change destroys and recreates the iframe (no updateConfig)', () => {
    const comp = mountLegacy({ startView: '/dashboard/a' });
    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    comp.$set({ startView: '/dashboard/b' });
    flushSync();

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);
    expect(firstInstance.updateConfig).not.toHaveBeenCalled();

    comp.$destroy();
  });

  it('timeout change does not recreate the iframe', () => {
    const comp = mountLegacy({ timeout: 5000 });

    comp.$set({ timeout: 9000, readyTimeout: 12000 });
    flushSync();

    expect(SDK.create).toHaveBeenCalledTimes(1);

    comp.$destroy();
  });
});
