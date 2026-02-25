<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { QuerriEmbed as SDK } from '../core/querri-embed.js';

  /** @type {string} Querri server URL (e.g. 'https://app.querri.com') */
  export let serverUrl;

  /** @type {'login' | { shareKey: string, org: string } | { fetchSessionToken: () => Promise<string> }} */
  export let auth;

  /** @type {string | undefined} Initial view path */
  export let startView = undefined;

  /** @type {{ sidebar?: { show?: boolean }, header?: { show?: boolean } } | undefined} */
  export let chrome = undefined;

  /** @type {Record<string, unknown> | undefined} */
  export let theme = undefined;

  /** @type {number | undefined} Maximum time (ms) to wait for iframe. Default: 15000 */
  export let timeout = undefined;

  const dispatch = createEventDispatcher();

  let containerEl;
  let instance = null;

  function create() {
    destroy();
    if (!containerEl) return;

    instance = SDK.create(containerEl, { serverUrl, auth, startView, chrome, theme, timeout });
    instance
      .on('ready', (d) => dispatch('ready', d))
      .on('error', (d) => dispatch('error', d))
      .on('session-expired', (d) => dispatch('session-expired', d))
      .on('navigation', (d) => dispatch('navigation', d));
  }

  function destroy() {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  }

  onDestroy(() => destroy());

  // Creates on mount (when containerEl is set by bind:this) and re-creates when props change
  $: serverUrl, auth, startView, chrome, theme, timeout, containerEl && create();

  /** Get the underlying SDK instance */
  export function getInstance() { return instance; }

  /** Get the iframe element */
  export function getIframe() { return instance?.iframe ?? null; }
</script>

<div bind:this={containerEl} {...$$restProps}
  style="width:100%;height:100%;{$$restProps.style || ''}"
></div>
