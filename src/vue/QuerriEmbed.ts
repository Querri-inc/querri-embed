import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  h,
  watch,
  type PropType,
} from 'vue';
import { QuerriEmbed as SDK } from '../core/querri-embed.js';
import type {
  QuerriAuth,
  QuerriEmbedOptions,
  QuerriInstance,
  QuerriPrivacyConfig,
} from '../core/querri-embed.js';

/** How long config-prop changes are coalesced before calling `updateConfig`. */
const CONFIG_DEBOUNCE_MS = 150;

export const QuerriEmbed = defineComponent({
  name: 'QuerriEmbed',

  props: {
    /** Querri server URL (e.g. 'https://app.querri.com') */
    serverUrl: { type: String, required: true },
    /** Authentication mode */
    auth: {
      type: [String, Object] as PropType<QuerriAuth>,
      required: true,
    },
    /** Initial view path (e.g. '/dashboard/uuid', '/chat/uuid'). Changing it recreates the iframe. */
    startView: { type: String, default: undefined },
    /** Chrome visibility config. Changes apply live via updateConfig (debounced). */
    chrome: {
      type: Object as PropType<QuerriEmbedOptions['chrome']>,
      default: undefined,
    },
    /** Theme overrides. Changes apply live via updateConfig (debounced). */
    theme: {
      type: Object as PropType<QuerriEmbedOptions['theme']>,
      default: undefined,
    },
    /** Privacy controls. Changes apply live via updateConfig (debounced). */
    privacy: {
      type: Object as PropType<QuerriPrivacyConfig>,
      default: undefined,
    },
    /** BCP-47 locale tag. Changes apply live via updateConfig (debounced). */
    locale: { type: String, default: undefined },
    /** Match iframe height to embedded content. Creation-time only. */
    autoHeight: { type: Boolean, default: undefined },
    /** Max time (ms) to wait for the iframe's ready. Creation-time only. Default: 30000 */
    readyTimeout: { type: Number, default: undefined },
    /** @deprecated Alias of readyTimeout. Creation-time only. */
    timeout: { type: Number, default: undefined },
  },

  emits: [
    'ready',
    'error',
    'session-expired',
    'navigation',
    'config',
    'resize',
    'chat',
    'recovered',
  ],

  setup(props, { emit, expose }) {
    const containerEl = ref<HTMLElement | null>(null);
    let instance: QuerriInstance | null = null;
    // Serialized config last handed to the instance — the content-compare
    // that keeps the deep watcher from posting per keystroke.
    let appliedConfig = '';
    let configTimer: ReturnType<typeof setTimeout> | null = null;

    function serializeConfig() {
      return JSON.stringify({
        chrome: props.chrome,
        theme: props.theme,
        privacy: props.privacy,
        locale: props.locale,
      });
    }

    function createInstance() {
      destroyInstance();
      if (!containerEl.value) return;

      instance = SDK.create(containerEl.value, {
        serverUrl: props.serverUrl,
        auth: props.auth,
        startView: props.startView,
        chrome: props.chrome,
        theme: props.theme,
        privacy: props.privacy,
        locale: props.locale,
        autoHeight: props.autoHeight,
        readyTimeout: props.readyTimeout,
        timeout: props.timeout,
      });
      appliedConfig = serializeConfig();

      instance
        .on('ready', (d) => emit('ready', d))
        .on('error', (d) => emit('error', d))
        .on('session-expired', (d) => emit('session-expired', d))
        .on('navigation', (d) => emit('navigation', d))
        .on('config', (d) => emit('config', d))
        .on('resize', (d) => emit('resize', d))
        .on('chat', (d) => emit('chat', d))
        .on('recovered', (d) => emit('recovered', d));
    }

    function destroyInstance() {
      if (configTimer !== null) {
        clearTimeout(configTimer);
        configTimer = null;
      }
      if (instance) {
        instance.destroy();
        instance = null;
      }
    }

    onMounted(() => createInstance());
    onUnmounted(() => destroyInstance());

    // Remount ONLY on serverUrl / auth / startView (content-compared —
    // inline object literals for auth must not recreate the iframe).
    // startView is baked into the iframe URL; updateConfig does not navigate.
    // timeout/readyTimeout are creation-only and deliberately unwatched.
    watch(
      () => JSON.stringify([props.serverUrl, props.auth, props.startView]),
      () => createInstance(),
    );

    // chrome/theme/privacy/locale apply live via updateConfig: content-compare
    // (the deep watcher fires on any mutation) then debounce so bursts
    // coalesce into one postMessage.
    watch(
      () => [props.chrome, props.theme, props.privacy, props.locale],
      () => {
        if (!instance) return;
        const serialized = serializeConfig();
        if (serialized === appliedConfig) return;
        if (configTimer !== null) clearTimeout(configTimer);
        configTimer = setTimeout(() => {
          configTimer = null;
          if (!instance) return;
          appliedConfig = serializeConfig();
          // Whole-object semantics: a prop back to undefined is sent as its
          // empty form so the runtime actually resets it.
          instance.updateConfig({
            chrome: props.chrome ?? {},
            theme: props.theme ?? {},
            privacy: props.privacy ?? {},
            locale: props.locale ?? '',
          });
        }, CONFIG_DEBOUNCE_MS);
      },
      { deep: true },
    );

    expose({
      get instance() {
        return instance;
      },
      get iframe() {
        return instance?.iframe ?? null;
      },
    });

    return () => h('div', { ref: containerEl, style: 'width:100%;height:100%' });
  },
});
