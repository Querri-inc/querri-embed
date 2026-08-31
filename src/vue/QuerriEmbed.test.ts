import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { QuerriEmbed } from './QuerriEmbed.js';

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

const SERVER_URL = 'https://app.querri.com';
const AUTH = { shareKey: 'sk-123', org: 'org-456' };

describe('Vue QuerriEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a div in the DOM', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });
    expect(wrapper.find('div').exists()).toBe(true);
    wrapper.unmount();
  });

  it('calls SDK.create with correct options on mount', () => {
    const wrapper = mount(QuerriEmbed, {
      props: {
        serverUrl: SERVER_URL,
        auth: AUTH,
        startView: '/builder/dashboard/abc',
        chrome: { sidebar: { show: false } },
        theme: { color: 'blue' },
      },
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
    });
    wrapper.unmount();
  });

  it('calls instance.destroy on unmount', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    wrapper.unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('emits ready event when SDK fires ready', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const readyCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'ready');
    expect(readyCall).toBeDefined();
    readyCall![1]({ some: 'data' }); // invoke the handler

    expect(wrapper.emitted('ready')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits error event when SDK fires error', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const errorCall = instance.on.mock.calls.find((c: unknown[]) => c[0] === 'error');
    expect(errorCall).toBeDefined();
    errorCall![1]({ code: 'test', message: 'err' });

    expect(wrapper.emitted('error')).toBeTruthy();
    expect(wrapper.emitted('error')![0]).toEqual([{ code: 'test', message: 'err' }]);
    wrapper.unmount();
  });

  it('exposes instance and iframe via component ref', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const exposed = wrapper.vm as unknown as { instance: unknown; iframe: unknown };
    expect(exposed.instance).not.toBeNull();
    expect(exposed.iframe).toBeInstanceOf(HTMLIFrameElement);
    wrapper.unmount();
  });

  it('recreates instance when serverUrl prop changes', async () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    await wrapper.setProps({ serverUrl: 'https://other.querri.com' });

    expect(firstInstance.destroy).toHaveBeenCalled();
    expect(SDK.create).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('passes timeout prop through to SDK.create', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH, timeout: 5000 },
    });

    const [, options] = (SDK.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.timeout).toBe(5000);
    wrapper.unmount();
  });

  it('registers handlers for the new events (config, resize, chat, recovered)', () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH },
    });

    const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;
    const onCalls = instance.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(onCalls).toContain('config');
    expect(onCalls).toContain('resize');
    expect(onCalls).toContain('chat');
    expect(onCalls).toContain('recovered');
    wrapper.unmount();
  });

  it('chrome change calls updateConfig (debounced) and does NOT destroy the iframe', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(QuerriEmbed, {
        props: { serverUrl: SERVER_URL, auth: AUTH, chrome: { rail: { show: false } } },
      });
      const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

      await wrapper.setProps({ chrome: { rail: { show: true } } });

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
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('same-content chrome object does not call updateConfig', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(QuerriEmbed, {
        props: { serverUrl: SERVER_URL, auth: AUTH, chrome: { rail: { show: true } } },
      });
      const instance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

      // New object reference, identical content — the deep watcher fires but
      // the content-compare must swallow it.
      await wrapper.setProps({ chrome: { rail: { show: true } } });
      vi.advanceTimersByTime(200);

      expect(instance.updateConfig).not.toHaveBeenCalled();
      expect(SDK.create).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('startView change destroys and recreates the iframe (no updateConfig)', async () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH, startView: '/dashboard/a' },
    });
    const firstInstance = (SDK.create as ReturnType<typeof vi.fn>).mock.results[0].value;

    await wrapper.setProps({ startView: '/dashboard/b' });

    expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
    expect(SDK.create).toHaveBeenCalledTimes(2);
    expect(firstInstance.updateConfig).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('timeout change does not recreate the iframe', async () => {
    const wrapper = mount(QuerriEmbed, {
      props: { serverUrl: SERVER_URL, auth: AUTH, timeout: 5000 },
    });

    await wrapper.setProps({ timeout: 9000, readyTimeout: 12000 });

    expect(SDK.create).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
