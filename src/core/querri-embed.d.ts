// ─── Generated Config Types ───────────────────────────────
//
// QuerriChromeConfig / QuerriThemeConfig / QuerriPrivacyConfig and the
// config-applied event types are GENERATED from schema/chrome-schema.json
// (the published server truth). Regenerate with `npm run generate:types`.

import type {
  QuerriChromeConfig,
  QuerriThemeConfig,
  QuerriPrivacyConfig,
  QuerriConfigChanges,
  QuerriConfigAppliedEvent,
} from './chrome-types.js';

export type {
  QuerriChromeConfig,
  QuerriThemeConfig,
  QuerriPrivacyConfig,
  QuerriConfigChanges,
  QuerriConfigAppliedEvent,
};

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
 * supplies that token to the embed.
 *
 * **Retry behaviour:** Each fetch cycle retries up to 3 times with
 * exponential backoff (1 s, 2 s). If the iframe rejects the token and
 * requests re-authentication, a new fetch cycle begins automatically.
 * A maximum of 3 fetch cycles are allowed before the SDK emits a
 * `token_fetch_exhausted` error and stops retrying. The cycle counter
 * resets whenever the iframe confirms successful authentication.
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

// ─── Legacy (v1) Config Types ─────────────────────────────
//
// The v1 chrome vocabulary. The runtime auto-upgrades these keys to their v2
// replacements on init (and reports each upgrade in the `config` event's
// `changes.upgraded` list), so existing code keeps working — but new code
// should use the v2 {@link QuerriChromeConfig} vocabulary directly.

/**
 * @deprecated v1 key. Use the v2 `rail` branch of {@link QuerriChromeConfig}
 * instead — `sidebar.show` upgrades to `rail.show`.
 */
export interface QuerriSidebarConfig {
  /** Sidebar visibility. @default false @see QuerriChromeConfig `rail.show` */
  show?: boolean;
}

/**
 * @deprecated v1 key. Use the v2 `header` branch of {@link QuerriChromeConfig}.
 *
 * NOTE: in v2 the header action defaults changed — `viewModeToggle`, `share`,
 * `print`, `automate`, `settings`, and `menu` all default to **false** (the v1
 * docs claimed true). Set them explicitly if you relied on them showing.
 */
export interface QuerriHeaderConfig {
  /** Header bar visibility. @default true @see QuerriChromeConfig `header.show` */
  show?: boolean;
  /** Show the chat / data-flow view-mode toggle. @default false @see QuerriChromeConfig `header.dataflow` (via `header.viewModeToggle` inherit) */
  viewModeToggle?: boolean;
  /** Show the Share button. @default false @see QuerriChromeConfig `header.share` */
  share?: boolean;
  /** Show the Print button. @default false @see QuerriChromeConfig `header.print` */
  print?: boolean;
  /** Show the Automate button. @default false @see QuerriChromeConfig `header.automate` */
  automate?: boolean;
  /** Show the Settings button. @default false @see QuerriChromeConfig `header.settings` */
  settings?: boolean;
  /** Show the kebab "more options" menu. @default false @see QuerriChromeConfig `header.menu` */
  menu?: boolean;
}

/**
 * @deprecated v1 shape. Use the v2 `chat.display` branch of
 * {@link QuerriChromeConfig}, which carries these keys and more.
 */
export interface QuerriChatDisplayConfig {
  /** Show table widgets. @default true */
  tables?: boolean;
  /** Show chart widgets. @default true */
  charts?: boolean;
  /** Show report widgets. @default true */
  reports?: boolean;
  /** Show suggestion chips. @default true */
  suggestions?: boolean;
  /** Show clarification prompts. @default true */
  clarifications?: boolean;
  /** Show choice / option pickers. @default true */
  choices?: boolean;
  /** Show plan cards. @default true */
  plans?: boolean;
  /** Show reasoning panels. @default true */
  reasoning?: boolean;
  /** Show standard chat messages. @default true */
  displayMessages?: boolean;
  /** Show action cards. @default true */
  actionCards?: boolean;
  /** Show the copy-to-clipboard action on assistant messages. @default true */
  copy?: boolean;
  /** Show the share action on assistant messages. @default true */
  share?: boolean;
  /** Show the print action on assistant messages. @default true */
  print?: boolean;
  /** Show the rerun action on assistant messages. @default true */
  rerun?: boolean;
}

/**
 * @deprecated v1 shape. Use the v2 `chat.reasoning` branch of
 * {@link QuerriChromeConfig} (same keys).
 */
export interface QuerriChatReasoningConfig {
  /** Merge reasoning into the same message bubble. @default true */
  merged?: boolean;
  /** Start with the reasoning panel expanded. @default false */
  startExpanded?: boolean;
}

/** A custom welcome-screen prompt button (shown above the input on empty chats). */
export interface QuerriWelcomePromptButton {
  /** Optional stable identifier; used for list keying. */
  id?: string;
  /** Visible button label. */
  label: string;
  /** Prompt text submitted when the button is clicked. */
  prompt: string;
}

/**
 * @deprecated v1 shape. Use the v2 `chat.welcome` branch of
 * {@link QuerriChromeConfig} (same keys, plus placeholders/greeting/etc.).
 */
export interface QuerriChatWelcomeConfig {
  /** Welcome heading text. Blank string hides the heading. @default '' */
  title?: string;
  /** Welcome subheading text. Blank string hides the subheading. @default '' */
  subtitle?: string;
  /** Quick-prompt buttons rendered below the welcome heading. @default [] */
  promptButtons?: QuerriWelcomePromptButton[];
}

/**
 * @deprecated v1 shape. Use the v2 `chat` branch of {@link QuerriChromeConfig}.
 * Upgrades: `connectData` → `rail.items.connect`, `extendedThinking` /
 * `fasterAnalysis` / `experimentalV2` → `chat.composer.thinkLonger`,
 * `simpleMode` → `chat.display.simpleMode`.
 */
export interface QuerriChatConfig {
  /** Render chat in full-width layout. @default false @see QuerriChromeConfig `chat.fullWidth` */
  fullWidth?: boolean;
  /** Enable the "Connect data" affordance. @default false @see QuerriChromeConfig `rail.items.connect` */
  connectData?: boolean;
  /** Enable extended-thinking responses. @default false @see QuerriChromeConfig `chat.composer.thinkLonger` */
  extendedThinking?: boolean;
  /** Simplified chat UI (fewer surfaces). @default false @see QuerriChromeConfig `chat.display.simpleMode` */
  simpleMode?: boolean;
  /** Faster analysis mode (the "zap" affordance in the chat toolbar). @default false @see QuerriChromeConfig `chat.composer.thinkLonger` */
  fasterAnalysis?: boolean;
  /**
   * @deprecated Use `fasterAnalysis` instead. If both are set,
   * `fasterAnalysis` takes precedence.
   * @see QuerriChromeConfig `chat.composer.thinkLonger`
   */
  experimentalV2?: boolean;
  display?: QuerriChatDisplayConfig;
  reasoning?: QuerriChatReasoningConfig;
  welcome?: QuerriChatWelcomeConfig;
}

/**
 * @deprecated The v1 chrome shape. The runtime auto-upgrades it; new code
 * should pass a v2 {@link QuerriChromeConfig}.
 */
export interface QuerriLegacyChromeConfig {
  sidebar?: QuerriSidebarConfig;
  header?: QuerriHeaderConfig;
  chat?: QuerriChatConfig;
}

// ─── Options ──────────────────────────────────────────────

/** Options passed to `QuerriEmbed.create()`. */
export interface QuerriEmbedOptions {
  /** Querri server URL (e.g. `'https://app.querri.com'`). */
  serverUrl: string;
  /** Authentication mode — `'login'`, share key object, session endpoint, or token callback. */
  auth: QuerriAuth;
  /**
   * Initial view path (e.g. `'/dashboard/uuid'`, `'/chat/uuid'`). Unset means
   * the runtime's own default (the home launcher). Baked into the iframe URL
   * at creation — `updateConfig` does not navigate.
   */
  startView?: string;
  /** Chrome UI visibility overrides (v2 vocabulary; the deprecated v1 shape is auto-upgraded). */
  chrome?: QuerriChromeConfig | QuerriLegacyChromeConfig;
  /** Theme overrides passed to the embedded application. */
  theme?: QuerriThemeConfig;
  /** Privacy controls for analytics/telemetry inside the embed. */
  privacy?: QuerriPrivacyConfig;
  /** BCP-47 locale tag for the embedded UI (e.g. `'en'`, `'de-DE'`). */
  locale?: string;
  /**
   * When `true`, the SDK sets the iframe's height to the embedded content's
   * reported height on every `resize` event. Creation-time only.
   * @default false
   */
  autoHeight?: boolean;
  /**
   * Maximum time in milliseconds to wait for the iframe's `ready` before
   * emitting a **recoverable** `'timeout'` error (retracted via the
   * `'recovered'` event if `ready` arrives late). `0` disables the warning.
   * Creation-time only.
   * @default 30000
   */
  readyTimeout?: number;
  /**
   * @deprecated Alias of {@link QuerriEmbedOptions.readyTimeout} — will be
   * removed in the next major. `readyTimeout` wins when both are set.
   */
  timeout?: number;
  /**
   * Internal: set by Querri's own configurator so its same-origin preview does
   * not record analytics or count as usage. Not for customer pages.
   */
  preview?: boolean;
}

/** Config accepted by {@link QuerriInstance.updateConfig}. */
export interface QuerriUpdateConfig {
  chrome?: QuerriChromeConfig | QuerriLegacyChromeConfig;
  theme?: QuerriThemeConfig;
  privacy?: QuerriPrivacyConfig;
  locale?: string;
  /** Internal — see {@link QuerriEmbedOptions.preview}. */
  preview?: boolean;
}

// ─── Event Types ──────────────────────────────────────────

/** Event names emitted by a `QuerriInstance`. */
export type QuerriEventType =
  | 'ready'
  | 'error'
  | 'session-expired'
  | 'navigation'
  | 'config'
  | 'resize'
  | 'chat'
  | 'recovered';

/** Error codes emitted by the SDK. */
export type QuerriErrorCode =
  | 'invalid_auth'
  | 'invalid_share_key'
  | 'invalid_start_view'
  | 'token_fetch_failed'
  | 'token_fetch_exhausted'
  | 'popup_blocked'
  | 'auth_failed'
  | 'auth_required'
  | 'auth_timeout'
  | 'init_timeout'
  | 'navigation_failed'
  | 'validation_failed'
  | 'timeout'
  | 'send_prompt_failed';

/** Payload for the `'error'` event. */
export interface QuerriErrorEvent {
  code: QuerriErrorCode;
  message: string;
  /**
   * `true` when the condition may clear on its own (e.g. a `'timeout'` where
   * the iframe is still loading). A recoverable error is RETRACTED via the
   * `'recovered'` event if the embed subsequently becomes ready.
   */
  recoverable?: boolean;
}

/** Payload for the `'navigation'` event. */
export interface QuerriNavigationEvent {
  type: 'navigation';
  path?: string;
  [key: string]: unknown;
}

/** Payload for the `'resize'` event (content height reported by the embed). */
export interface QuerriResizeEvent {
  type?: 'resize';
  /** Content height in CSS pixels. */
  height: number;
  [key: string]: unknown;
}

/** Payload for the `'chat'` event (chat lifecycle: sent / finished / error). */
export interface QuerriChatEvent {
  type?: 'chat';
  phase?: string;
  [key: string]: unknown;
}

/** Payload for the `'recovered'` event — retracts an earlier recoverable error. */
export interface QuerriRecoveredEvent {
  /** The error code being retracted (e.g. `'timeout'`). */
  code: QuerriErrorCode;
  /** Milliseconds after creation at which the embed recovered. */
  afterMs?: number;
  [key: string]: unknown;
}

/** Typed callback for each event type. */
export type QuerriEventCallback<T extends QuerriEventType> =
  T extends 'ready' ? (data: Record<string, never>) => void :
  T extends 'error' ? (data: QuerriErrorEvent) => void :
  T extends 'session-expired' ? (data: Record<string, never>) => void :
  T extends 'navigation' ? (data: QuerriNavigationEvent) => void :
  T extends 'config' ? (data: QuerriConfigAppliedEvent) => void :
  T extends 'resize' ? (data: QuerriResizeEvent) => void :
  T extends 'chat' ? (data: QuerriChatEvent) => void :
  T extends 'recovered' ? (data: QuerriRecoveredEvent) => void :
  never;

/** Options for {@link QuerriInstance.sendPrompt}. */
export interface SendPromptOptions {
  /**
   * If `true`, submit the prompt immediately without displaying it in the
   * input panel. If `false` (default), the text is placed in the prompt
   * panel for the user to see and edit before sending.
   * @default false
   */
  autoSubmit?: boolean;
}

/** Result resolved by {@link QuerriInstance.sendPrompt}. */
export interface SendPromptResult {
  /** `false` when the embed is not ready or the current view has no prompt input. */
  ok: boolean;
  message: string;
}

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
  on<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): this;
  /**
   * Unsubscribe a previously registered callback.
   * @returns `this` for chaining.
   */
  off<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): this;
  /**
   * Replace the chrome/theme/privacy/locale this embed is using.
   *
   * Send the WHOLE object, not a patch: the runtime replaces the customer
   * config layer, so a key you leave out returns to its default. Safe before
   * `ready` — the config is folded into the init that follows. Does not
   * navigate; `startView` is creation-time only.
   */
  updateConfig(config: QuerriUpdateConfig): this;
  /**
   * Put text in the embed's composer, and optionally send it.
   * Resolves with `{ ok, message }` — `ok: false` when the embed is not ready
   * or the current view has no prompt input (a real answer, not silence).
   */
  sendPrompt(text: string, options?: SendPromptOptions): Promise<SendPromptResult>;
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
  /** SDK version string (semver, e.g. `'0.0.0-test'`). */
  readonly version: string;
}

export declare const QuerriEmbed: QuerriEmbedStatic;
export default QuerriEmbed;
