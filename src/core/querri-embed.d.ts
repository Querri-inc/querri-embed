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

// ─── Config Types ─────────────────────────────────────────

/** Controls which sidebar UI is visible inside the embed. */
export interface QuerriSidebarConfig {
  /** Sidebar visibility. @default false */
  show?: boolean;
}

/** Controls which header / page-toolbar UI is visible inside the embed. */
export interface QuerriHeaderConfig {
  /** Header bar visibility. @default true */
  show?: boolean;
  /** Show the chat / data-flow view-mode toggle on project pages. @default true */
  viewModeToggle?: boolean;
  /** Show the Share button on project / dashboard pages. @default true */
  share?: boolean;
  /** Show the Print button on project / dashboard pages. @default true */
  print?: boolean;
  /** Show the Automate button on project pages. @default true */
  automate?: boolean;
  /** Show the Settings button. @default true */
  settings?: boolean;
  /** Show the kebab "more options" menu on project / dashboard pages. @default true */
  menu?: boolean;
}

/** Controls which chat display surfaces render inside project / chat views. */
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

/** Controls how the reasoning / "thinking" panel renders. */
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

/** Controls the empty-chat welcome screen content. */
export interface QuerriChatWelcomeConfig {
  /** Welcome heading text. Blank string hides the heading. @default '' */
  title?: string;
  /** Welcome subheading text. Blank string hides the subheading. @default '' */
  subtitle?: string;
  /** Quick-prompt buttons rendered below the welcome heading. @default [] */
  promptButtons?: QuerriWelcomePromptButton[];
}

/** Controls chat / project-page behavior and surfaces. */
export interface QuerriChatConfig {
  /** Render chat in full-width layout. @default false */
  fullWidth?: boolean;
  /** Enable the "Connect data" affordance. @default false */
  connectData?: boolean;
  /** Enable extended-thinking responses. @default false */
  extendedThinking?: boolean;
  /** Simplified chat UI (fewer surfaces). @default false */
  simpleMode?: boolean;
  /** Enable the skills picker. @default false */
  skills?: boolean;
  /** Faster analysis mode (the "zap" affordance in the chat toolbar). @default false */
  fasterAnalysis?: boolean;
  /**
   * @deprecated Use `fasterAnalysis` instead. Kept for backwards
   * compatibility; will be removed in a future major release. If both
   * are set, `fasterAnalysis` takes precedence.
   */
  experimentalV2?: boolean;
  display?: QuerriChatDisplayConfig;
  reasoning?: QuerriChatReasoningConfig;
  welcome?: QuerriChatWelcomeConfig;
}

/** Controls which chrome UI elements are visible inside the embed. */
export interface QuerriChromeConfig {
  sidebar?: QuerriSidebarConfig;
  header?: QuerriHeaderConfig;
  chat?: QuerriChatConfig;
}

/** Theme overrides applied to the embedded application. */
export interface QuerriThemeConfig {
  /** Color scheme override. `null` follows the host OS. @default null */
  scheme?: 'light' | 'dark' | null;
  /**
   * CSS custom property overrides. Keys must begin with `--` and map
   * to valid CSS values (typically colors). Applied to
   * `document.documentElement.style`. See the README for the canonical
   * `--ui-*` token list.
   */
  colors?: Record<string, string>;
}

/** Options passed to `QuerriEmbed.create()`. */
export interface QuerriEmbedOptions {
  /** Querri server URL (e.g. `'https://app.querri.com'`). */
  serverUrl: string;
  /** Authentication mode — `'login'`, share key object, session endpoint, or token callback. */
  auth: QuerriAuth;
  /** Initial view path (e.g. `'/dashboard/uuid'`, `'/chat/uuid'`). @default '/home' */
  startView?: string;
  /** Chrome UI visibility overrides. */
  chrome?: QuerriChromeConfig;
  /** Theme overrides passed to the embedded application. */
  theme?: QuerriThemeConfig;
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
  | 'token_fetch_exhausted'
  | 'popup_blocked'
  | 'auth_failed'
  | 'auth_required'
  | 'timeout'
  | 'send_prompt_failed';

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
  /**
   * Set text in the embedded prompt input, optionally auto-submitting it.
   * Requires {@link ready} to be `true`. Emits an `'error'` event with code
   * `'send_prompt_failed'` if the embed is not ready or the current view
   * has no prompt input.
   */
  sendPrompt(text: string, options?: SendPromptOptions): void;
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
