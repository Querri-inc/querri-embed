import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { QuerriEmbed } from './QuerriEmbed.js';

// Mock the core SDK
vi.mock('../core/querri-embed.js', () => ({
  QuerriEmbed: {
    create: vi.fn(() => {
      const inst = {
        on: vi.fn().mockReturnThis(),
        off: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        iframe: document.createElement('iframe'),
        ready: false,
      };
      return inst;
    }),
    version: '0.1.0',
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
});
