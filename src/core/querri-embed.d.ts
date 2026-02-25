// ─── Auth Types ───────────────────────────────────────────

/**
 * Public dashboard share authentication.
 * Use when embedding a publicly shared dashboard — no user login required.
 */
export interface QuerriShareKeyAuth {
  /** Share key from your dashboard's share link. */
  shareKey: string;
  /** Your Querri organization ID. */
  org: string;
}

/**
 * Server-token authentication.
 * Your backend exchanges an API key for a session token; the callback
 * supplies that token to the embed. The SDK automatically retries up to
 * 3 times with exponential backoff on failure.
 */
export interface QuerriTokenAuth {
  /** Async function that returns a session token string (e.g. via `fetch('/api/querri-session')`). */
  fetchSessionToken: () => Promise<string>;
}

/**
 * Server-token authentication via endpoint URL.
 * Shorthand for `fetchSessionToken` — the SDK POSTs to the endpoint and
 * extracts `session_token` from the JSON response. Retries automatically.
 */
export interface QuerriSessionEndpointAuth {
  /** URL of your session endpoint (e.g. `'/api/querri-session'`). The SDK sends a POST request and expects `{ session_token: string }` in the response. */
  sessionEndpoint: string;
}

/** Authentication mode for the embed. */
export type QuerriAuth = 'login' | QuerriShareKeyAuth | QuerriTokenAuth | QuerriSessionEndpointAuth;

// ─── Config Types ─────────────────────────────────────────

/** Controls which chrome UI elements are visible inside the embed. */
export interface QuerriChromeConfig {
  /** Sidebar visibility. @default `{ show: false }` */
  sidebar?: { show?: boolean };
  /** Header visibility. @default `{ show: true }` */
  header?: { show?: boolean };
}

/** Options passed to `QuerriEmbed.create()`. */
export interface QuerriEmbedOptions {
  /** Querri server URL (e.g. `'https://app.querri.com'`). */
  serverUrl: string;
  /** Authentication mode — `'login'`, share key object, session endpoint, or token callback. */
  auth: QuerriAuth;
  /** Initial view path (e.g. `'/builder/dashboard/uuid'`). */
  startView?: string;
  /** Chrome UI visibility overrides. */
  chrome?: QuerriChromeConfig;
  /** Theme overrides passed to the embedded application. */
  theme?: Record<string, unknown>;
  /**
   * Maximum time in milliseconds to wait for the iframe to respond.
   * If the iframe does not send a 'ready' message within this time,
   * an error event with code `'timeout'` is emitted.
   * @default 15000
   */
  timeout?: number;
}

// ─── Event Types ──────────────────────────────────────────

/** Event names emitted by a `QuerriInstance`. */
export type QuerriEventType = 'ready' | 'error' | 'session-expired' | 'navigation';

/** Error codes emitted by the SDK. */
export type QuerriErrorCode =
  | 'invalid_auth'
  | 'token_fetch_failed'
  | 'popup_blocked'
  | 'auth_failed'
  | 'auth_required'
  | 'timeout';

/** Payload for the `'error'` event. */
export interface QuerriErrorEvent {
  code: QuerriErrorCode;
  message: string;
}

/** Payload for the `'navigation'` event. */
export interface QuerriNavigationEvent {
  type: 'navigation';
  path?: string;
  [key: string]: unknown;
}

/** Typed callback for each event type. */
export type QuerriEventCallback<T extends QuerriEventType> =
  T extends 'ready' ? (data: Record<string, never>) => void :
  T extends 'error' ? (data: QuerriErrorEvent) => void :
  T extends 'session-expired' ? (data: Record<string, never>) => void :
  T extends 'navigation' ? (data: QuerriNavigationEvent) => void :
  never;

// ─── Instance ─────────────────────────────────────────────

/** A running embed instance returned by `QuerriEmbed.create()`. */
export interface QuerriInstance {
  /** The iframe DOM element, or `null` before it's created. */
  readonly iframe: HTMLIFrameElement | null;
  /** `true` once the embed has authenticated and sent a ready message. */
  readonly ready: boolean;
  /**
   * Subscribe to an event. Returns `this` for chaining.
   * @example instance.on('ready', () => {}).on('error', (e) => console.error(e));
   */
  on<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): QuerriInstance;
  /**
   * Unsubscribe a previously registered callback.
   * @returns `this` for chaining.
   */
  off<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): QuerriInstance;
  /** Remove the iframe, clear timers, and detach all event listeners. */
  destroy(): void;
}

// ─── Static API ───────────────────────────────────────────

/** The `QuerriEmbed` namespace. */
export interface QuerriEmbedStatic {
  /**
   * Create an embed instance inside `container`.
   * @param container CSS selector string or an `HTMLElement`.
   * @param options Embed configuration.
   * @throws If called in a non-browser environment (SSR).
   */
  create(container: string | HTMLElement, options: QuerriEmbedOptions): QuerriInstance;
  /** SDK version string (semver, e.g. `'0.1.0'`). */
  readonly version: string;
}

export declare const QuerriEmbed: QuerriEmbedStatic;
export default QuerriEmbed;
