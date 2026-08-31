<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { QuerriEmbed as SDK } from '../core/querri-embed.js';

  /** How long config-prop changes are coalesced before calling updateConfig. */
  const CONFIG_DEBOUNCE_MS = 150;

  /** @type {string} Querri server URL (e.g. 'https://app.querri.com') */
  export let serverUrl;

  /** @type {'login' | { shareKey: string, org: string } | { sessionEndpoint: string } | { fetchSessionToken: () => Promise<string> }} */
  export let auth;

  /** @type {string | undefined} Initial view path. Changing it recreates the iframe. */
  export let startView = undefined;

  /** @type {import('../core/querri-embed.js').QuerriEmbedOptions['chrome']} Chrome visibility config. Changes apply live via updateConfig (debounced). */
  export let chrome = undefined;

  /** @type {import('../core/querri-embed.js').QuerriEmbedOptions['theme']} Theme overrides. Changes apply live via updateConfig (debounced). */
  export let theme = undefined;

  /** @type {import('../core/querri-embed.js').QuerriPrivacyConfig | undefined} Privacy controls. Changes apply live via updateConfig (debounced). */
  export let privacy = undefined;

  /** @type {string | undefined} BCP-47 locale tag. Changes apply live via updateConfig (debounced). */
  export let locale = undefined;

  /** @type {boolean | undefined} Match iframe height to embedded content. Creation-time only. */
  export let autoHeight = undefined;

  /** @type {number | undefined} Max time (ms) to wait for the iframe's ready. Creation-time only. Default: 30000 */
  export let readyTimeout = undefined;

  /** @deprecated Alias of readyTimeout. Creation-time only. @type {number | undefined} */
  export let timeout = undefined;

  const dispatch = createEventDispatcher();

  let containerEl;
  let instance = null;
  // Serialized config last handed to the instance — the content-compare that
  // keeps object-literal props from posting a no-op update every re-render.
  let appliedConfig = '';
  let configTimer = null;
  let prevRemountKey;

  function serializeConfig() {
    return JSON.stringify({ chrome, theme, privacy, locale });
  }

  function create() {
    destroy();
    if (!containerEl) return;

    instance = SDK.create(containerEl, {
      serverUrl,
      auth,
      startView,
      chrome,
      theme,
      privacy,
      locale,
      autoHeight,
      readyTimeout,
      timeout,
    });
    appliedConfig = serializeConfig();
    instance
      .on('ready', (d) => dispatch('ready', d))
      .on('error', (d) => dispatch('error', d))
      .on('session-expired', (d) => dispatch('session-expired', d))
      .on('navigation', (d) => dispatch('navigation', d))
      .on('config', (d) => dispatch('config', d))
      .on('resize', (d) => dispatch('resize', d))
      .on('chat', (d) => dispatch('chat', d))
      .on('recovered', (d) => dispatch('recovered', d));
  }

  function destroy() {
    if (configTimer !== null) {
      clearTimeout(configTimer);
      configTimer = null;
    }
    if (instance) {
      instance.destroy();
      instance = null;
    }
  }

  function scheduleConfigUpdate() {
    if (configTimer !== null) clearTimeout(configTimer);
    configTimer = setTimeout(() => {
      configTimer = null;
      if (!instance) return;
      appliedConfig = serializeConfig();
      // Whole-object semantics: a prop back to undefined is sent as its
      // empty form so the runtime actually resets it.
      instance.updateConfig({
        chrome: chrome ?? {},
        theme: theme ?? {},
        privacy: privacy ?? {},
        locale: locale ?? '',
      });
    }, CONFIG_DEBOUNCE_MS);
  }

  onDestroy(() => destroy());

  // Remount ONLY on serverUrl / auth / startView (content-compared).
  // startView is baked into the iframe URL; updateConfig does not navigate.
  // timeout/readyTimeout are creation-only and deliberately not watched.
  $: remountKey = JSON.stringify([serverUrl, auth, startView]);
  $: if (containerEl && remountKey !== prevRemountKey) {
    prevRemountKey = remountKey;
    create();
  }

  // chrome/theme/privacy/locale apply live via updateConfig: content-compare,
  // then debounce so bursts coalesce into one postMessage.
  $: configKey = JSON.stringify({ chrome, theme, privacy, locale });
  $: if (instance && configKey !== appliedConfig) {
    scheduleConfigUpdate();
  }

  /** Get the underlying SDK instance */
  export function getInstance() { return instance; }

  /** Get the iframe element */
  export function getIframe() { return instance?.iframe ?? null; }
</script>

<div bind:this={containerEl} {...$$restProps}
  style="width:100%;height:100%;{$$restProps.style || ''}"
></div>
