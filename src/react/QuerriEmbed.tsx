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
} from '../core/querri-embed.js';

export interface QuerriEmbedProps {
  /** Querri server URL (e.g. 'https://app.querri.com') */
  serverUrl: string;
  /** Authentication mode */
  auth: QuerriEmbedOptions['auth'];
  /** Initial view path (e.g. '/builder/dashboard/uuid') */
  startView?: string;
  /** Chrome visibility config */
  chrome?: QuerriEmbedOptions['chrome'];
  /** Theme overrides */
  theme?: QuerriEmbedOptions['theme'];
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
}

export interface QuerriEmbedRef {
  /** The underlying SDK instance */
  instance: QuerriInstance | null;
  /** The iframe DOM element */
  iframe: HTMLIFrameElement | null;
}

export const QuerriEmbed = forwardRef<QuerriEmbedRef, QuerriEmbedProps>(
  function QuerriEmbed(
    {
      serverUrl,
      auth,
      startView,
      chrome,
      theme,
      className,
      style,
      onReady,
      onError,
      onSessionExpired,
      onNavigation,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<QuerriInstance | null>(null);

    // Stable callback refs — prevents iframe recreation when handlers change
    const handlersRef = useRef({ onReady, onError, onSessionExpired, onNavigation });
    handlersRef.current = { onReady, onError, onSessionExpired, onNavigation };

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

      const instance = SDK.create(containerRef.current, {
        serverUrl,
        auth,
        startView,
        chrome,
        theme,
      });

      instance
        .on('ready', () => handlersRef.current.onReady?.())
        .on('error', (data) => handlersRef.current.onError?.(data))
        .on('session-expired', () => handlersRef.current.onSessionExpired?.())
        .on('navigation', (data) => handlersRef.current.onNavigation?.(data));

      instanceRef.current = instance;

      return () => {
        instance.destroy();
        instanceRef.current = null;
      };
      // Changing auth or serverUrl destroys and recreates the iframe.
      // Changing event handlers does NOT (via handlersRef pattern).
      // NOTE: If auth is an object, memoize it to prevent unnecessary recreation.
    }, [serverUrl, auth, startView, chrome, theme]);

    return <div ref={containerRef} className={className} style={style} />;
  }
);
