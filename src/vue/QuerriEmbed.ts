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
  QuerriChromeConfig,
  QuerriInstance,
} from '../core/querri-embed.js';

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
    /** Initial view path (e.g. '/builder/dashboard/uuid') */
    startView: { type: String, default: undefined },
    /** Chrome visibility config */
    chrome: {
      type: Object as PropType<QuerriChromeConfig>,
      default: undefined,
    },
    /** Theme overrides */
    theme: {
      type: Object as PropType<Record<string, unknown>>,
      default: undefined,
    },
    /** Maximum time (ms) to wait for iframe to respond. Default: 15000 */
    timeout: { type: Number, default: undefined },
  },

  emits: ['ready', 'error', 'session-expired', 'navigation'],

  setup(props, { emit, expose }) {
    const containerEl = ref<HTMLElement | null>(null);
    let instance: QuerriInstance | null = null;

    function createInstance() {
      destroyInstance();
      if (!containerEl.value) return;

      instance = SDK.create(containerEl.value, {
        serverUrl: props.serverUrl,
        auth: props.auth,
        startView: props.startView,
        chrome: props.chrome,
        theme: props.theme,
        timeout: props.timeout,
      });

      instance
        .on('ready', (d) => emit('ready', d))
        .on('error', (d) => emit('error', d))
        .on('session-expired', (d) => emit('session-expired', d))
        .on('navigation', (d) => emit('navigation', d));
    }

    function destroyInstance() {
      if (instance) {
        instance.destroy();
        instance = null;
      }
    }

    onMounted(() => createInstance());
    onUnmounted(() => destroyInstance());

    // Recreate on prop changes that require a new iframe session
    watch(
      () => [props.serverUrl, props.auth, props.startView, props.chrome, props.theme, props.timeout],
      () => createInstance(),
      { deep: true }
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
