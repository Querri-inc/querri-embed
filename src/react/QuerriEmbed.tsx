import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { QuerriEmbed as SDK } from '../core/querri-embed.js';
import type {
  QuerriEmbedOptions,
  QuerriInstance,
  QuerriErrorEvent,
  QuerriNavigationEvent,
  QuerriConfigAppliedEvent,
  QuerriResizeEvent,
  QuerriChatEvent,
  QuerriRecoveredEvent,
} from '../core/querri-embed.js';

/** How long config-prop changes are coalesced before calling `updateConfig`. */
const CONFIG_DEBOUNCE_MS = 150;

export interface QuerriEmbedProps {
  /** Querri server URL (e.g. 'https://app.querri.com') */
  serverUrl: string;
  /** Authentication mode */
  auth: QuerriEmbedOptions['auth'];
  /** Initial view path (e.g. '/dashboard/uuid', '/chat/uuid'). Changing it recreates the iframe. */
  startView?: string;
  /** Chrome visibility config. Changes apply live via `updateConfig` (debounced). */
  chrome?: QuerriEmbedOptions['chrome'];
  /** Theme overrides. Changes apply live via `updateConfig` (debounced). */
  theme?: QuerriEmbedOptions['theme'];
  /** Privacy controls. Changes apply live via `updateConfig` (debounced). */
  privacy?: QuerriEmbedOptions['privacy'];
  /** BCP-47 locale tag. Changes apply live via `updateConfig` (debounced). */
  locale?: string;
  /** Match iframe height to embedded content. Creation-time only. */
  autoHeight?: boolean;
  /** Max time (ms) to wait for the iframe's ready before a recoverable timeout error. Creation-time only. @default 30000 */
  readyTimeout?: number;
  /** @deprecated Alias of `readyTimeout`. Creation-time only. */
  timeout?: number;
  /** Container className */
  className?: string;
  /** Container inline style */
  style?: React.CSSProperties;
  /** Fired when embed is authenticated and ready */
  onReady?: () => void;
  /** Fired on error */
  onError?: (error: QuerriErrorEvent) => void;
  /** Fired when session expires */
  onSessionExpired?: () => void;
  /** Fired on navigation inside the embed */
  onNavigation?: (data: QuerriNavigationEvent) => void;
  /** Fired when the runtime reports what config it applied (and what it changed) */
  onConfig?: (data: QuerriConfigAppliedEvent) => void;
  /** Fired when the embedded content reports a new height */
  onResize?: (data: QuerriResizeEvent) => void;
  /** Fired on chat lifecycle events (sent / finished / error) */
  onChat?: (data: QuerriChatEvent) => void;
  /** Fired when a recoverable error (e.g. ready timeout) is retracted */
  onRecovered?: (data: QuerriRecoveredEvent) => void;
}

export interface QuerriEmbedRef {
  /** The underlying SDK instance */
  instance: QuerriInstance | null;
  /** The iframe DOM element */
  iframe: HTMLIFrameElement | null;
}

/**
 * Returns a stable reference for a value, only updating the reference
 * when the serialized (JSON) form actually changes. This prevents
 * unnecessary useEffect re-runs when callers pass inline object literals
 * like `auth={{ shareKey: '...', org: '...' }}`.
 */
function useStableValue<T>(value: T): T {
  const ref = useRef(value);
  const prevSerialized = useRef<string | undefined>(undefined);
  const serialized = JSON.stringify(value);

  if (serialized !== prevSerialized.current) {
    ref.current = value;
    prevSerialized.current = serialized;
  }

  return ref.current;
}

export const QuerriEmbed = forwardRef<QuerriEmbedRef, QuerriEmbedProps>(
  function QuerriEmbed(
    {
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
      className,
      style,
      onReady,
      onError,
      onSessionExpired,
      onNavigation,
      onConfig,
      onResize,
      onChat,
      onRecovered,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<QuerriInstance | null>(null);

    // Only auth needs stabilizing for the remount effect; the config props
    // never remount — they flow through updateConfig below.
    const stableAuth = useStableValue(auth);

    // Latest creation-time values, read inside the create effect without
    // being effect dependencies: changing any of these must NOT recreate
    // the iframe (config props update live; timeout props are creation-only).
    const createOptsRef = useRef({ chrome, theme, privacy, locale, autoHeight, readyTimeout, timeout });
    createOptsRef.current = { chrome, theme, privacy, locale, autoHeight, readyTimeout, timeout };

    // Serialized config last handed to the instance (at create or via
    // updateConfig) — the content-compare that stops no-op updates.
    const appliedConfigRef = useRef<string>('');

    // Stable callback refs — prevents iframe recreation when handlers change
    const handlersRef = useRef({
      onReady, onError, onSessionExpired, onNavigation,
      onConfig, onResize, onChat, onRecovered,
    });
    handlersRef.current = {
      onReady, onError, onSessionExpired, onNavigation,
      onConfig, onResize, onChat, onRecovered,
    };

    useImperativeHandle(ref, () => ({
      get instance() {
        return instanceRef.current;
      },
      get iframe() {
        return instanceRef.current?.iframe ?? null;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const opts = createOptsRef.current;
      const instance = SDK.create(containerRef.current, {
        serverUrl,
        auth: stableAuth,
        startView,
        chrome: opts.chrome,
        theme: opts.theme,
        privacy: opts.privacy,
        locale: opts.locale,
        autoHeight: opts.autoHeight,
        readyTimeout: opts.readyTimeout,
        timeout: opts.timeout,
      });
      appliedConfigRef.current = JSON.stringify({
        chrome: opts.chrome, theme: opts.theme, privacy: opts.privacy, locale: opts.locale,
      });

      instance
        .on('ready', () => handlersRef.current.onReady?.())
        .on('error', (data) => handlersRef.current.onError?.(data))
        .on('session-expired', () => handlersRef.current.onSessionExpired?.())
        .on('navigation', (data) => handlersRef.current.onNavigation?.(data))
        .on('config', (data) => handlersRef.current.onConfig?.(data))
        .on('resize', (data) => handlersRef.current.onResize?.(data))
        .on('chat', (data) => handlersRef.current.onChat?.(data))
        .on('recovered', (data) => handlersRef.current.onRecovered?.(data));

      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
      // Remount ONLY on serverUrl / auth (content-compared) / startView —
      // startView is baked into the iframe URL; updateConfig does not navigate.
      // chrome/theme/privacy/locale apply live below; timeout props are
      // creation-only and deliberately absent from this list.
    }, [serverUrl, stableAuth, startView]);

    // Live config updates: content-compare, then debounce so bursts (e.g. a
    // color picker driving theme) coalesce into one postMessage.
    const configSerialized = JSON.stringify({ chrome, theme, privacy, locale });
    useEffect(() => {
      if (!instanceRef.current) return;
      if (configSerialized === appliedConfigRef.current) return;

      const timer = setTimeout(() => {
        appliedConfigRef.current = configSerialized;
        // Whole-object semantics: the runtime replaces the customer config
        // layer, so a prop that went back to undefined must be sent as its
        // empty form to actually reset.
        instanceRef.current?.updateConfig({
          chrome: chrome ?? {},
          theme: theme ?? {},
          privacy: privacy ?? {},
          locale: locale ?? '',
        });
      }, CONFIG_DEBOUNCE_MS);

      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configSerialized]);

    return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
  }
);
