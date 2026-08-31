import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuerriEmbedComponent } from './querri-embed.component.js';
import { SimpleChange } from '@angular/core';

// Mock the core SDK
vi.mock('../core/querri-embed.js', () => ({
  QuerriEmbed: {
    create: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      updateConfig: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      iframe: document.createElement('iframe'),
      ready: false,
    })),
    version: '0.0.0-test',
  },
}));

import { QuerriEmbed as SDK } from '../core/querri-embed.js';

const SERVER_URL = 'https://app.querri.com';
const AUTH = { shareKey: 'sk-123', org: 'org-456' };

function createComponent(): QuerriEmbedComponent {
  const component = new QuerriEmbedComponent();
  // Simulate @ViewChild — provide a fake ElementRef
  (component as any).containerRef = {
    nativeElement: document.createElement('div'),
  };
  component.serverUrl = SERVER_URL;
  component.auth = AUTH;
  return component;
}

describe('Angular QuerriEmbedComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to return fresh instance each call
    (SDK.create as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      updateConfig: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      iframe: document.createElement('iframe'),
      ready: false,
    }));
  });

  it('calls SDK.create with correct options on ngOnInit', () => {
    const component = createComponent();
    component.startView = '/builder/dashboard/abc';
    component.chrome = { sidebar: { show: false } };
    component.theme = { color: 'blue' };
    component.timeout = 5000;

    component.ngOnInit();

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

    component.ngOnDestroy();
  });

  it('destroys old and creates new instance on ngOnChanges', () => {
    const component = createComponent();
    component.ngOnInit();

    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    // Simulate a serverUrl change
    component.serverUrl = 'https://other.querri.com';
    component.ngOnChanges({
      serverUrl: new SimpleChange(SERVER_URL, 'https://other.querri.com', false),
    });

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);

    component.ngOnDestroy();
  });

  it('does not recreate before initialization', () => {
    const component = createComponent();

    // ngOnChanges before ngOnInit should be a no-op
    component.ngOnChanges({
      serverUrl: new SimpleChange(undefined, SERVER_URL, true),
    });

    expect(SDK.create).not.toHaveBeenCalled();

    component.ngOnInit();
    component.ngOnDestroy();
  });

  it('calls instance.destroy on ngOnDestroy', () => {
    const component = createComponent();
    component.ngOnInit();

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    component.ngOnDestroy();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('emits events when SDK fires them', () => {
    const component = createComponent();
    const readySpy = vi.fn();
    const errorSpy = vi.fn();
    component.ready.subscribe(readySpy);
    component.error.subscribe(errorSpy);

    component.ngOnInit();

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    // Find the ready handler registered via .on('ready', ...)
    const readyCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'ready');
    expect(readyCall).toBeDefined();
    readyCall![1]({});
    expect(readySpy).toHaveBeenCalledTimes(1);

    const errorCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'error');
    expect(errorCall).toBeDefined();
    errorCall![1]({ code: 'timeout', message: 'timed out' });
    expect(errorSpy).toHaveBeenCalledWith({ code: 'timeout', message: 'timed out' });

    component.ngOnDestroy();
  });

  it('chrome change calls updateConfig (debounced) and does NOT destroy the iframe', () => {
    vi.useFakeTimers();
    try {
      const component = createComponent();
      component.chrome = { rail: { show: false } };
      component.ngOnInit();

      const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

      const previous = component.chrome;
      component.chrome = { rail: { show: true } };
      component.ngOnChanges({
        chrome: new SimpleChange(previous, component.chrome, false),
      });

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

      component.ngOnDestroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('startView change destroys and recreates the iframe (no updateConfig)', () => {
    const component = createComponent();
    component.startView = '/dashboard/a';
    component.ngOnInit();

    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    component.startView = '/dashboard/b';
    component.ngOnChanges({
      startView: new SimpleChange('/dashboard/a', '/dashboard/b', false),
    });

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);
    expect(firstInstance.updateConfig).not.toHaveBeenCalled();

    component.ngOnDestroy();
  });

  it('same-content auth object does not recreate the iframe', () => {
    const component = createComponent();
    component.ngOnInit();

    component.auth = { shareKey: 'sk-123', org: 'org-456' };
    component.ngOnChanges({
      auth: new SimpleChange(AUTH, component.auth, false),
    });

    expect(SDK.create).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
  });

  it('timeout change does not recreate the iframe', () => {
    const component = createComponent();
    component.timeout = 5000;
    component.ngOnInit();

    component.timeout = 9000;
    component.ngOnChanges({
      timeout: new SimpleChange(5000, 9000, false),
    });

    expect(SDK.create).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
  });

  it('registers handlers for the new events (config, resize, chat, recovered)', () => {
    const component = createComponent();
    component.ngOnInit();

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const onCalls = instance.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(onCalls).toContain('config');
    expect(onCalls).toContain('resize');
    expect(onCalls).toContain('chat');
    expect(onCalls).toContain('recovered');

    component.ngOnDestroy();
  });

  it('exposes sdkInstance and iframe getters', () => {
    const component = createComponent();
    component.ngOnInit();

    expect(component.sdkInstance).not.toBeNull();
    expect(component.iframe).toBeInstanceOf(HTMLIFrameElement);

    component.ngOnDestroy();

    expect(component.sdkInstance).toBeNull();
    expect(component.iframe).toBeNull();
  });
});
