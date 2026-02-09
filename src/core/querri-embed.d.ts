// ─── Auth Types ───────────────────────────────────────────

export interface QuerriShareKeyAuth {
  shareKey: string;
  org: string;
}

export interface QuerriTokenAuth {
  fetchSessionToken: () => Promise<string>;
}

export type QuerriAuth = 'login' | QuerriShareKeyAuth | QuerriTokenAuth;

// ─── Config Types ─────────────────────────────────────────

export interface QuerriChromeConfig {
  sidebar?: { show?: boolean };
  header?: { show?: boolean };
}

export interface QuerriEmbedOptions {
  serverUrl: string;
  auth: QuerriAuth;
  startView?: string;
  chrome?: QuerriChromeConfig;
  theme?: Record<string, unknown>;
}

// ─── Event Types ──────────────────────────────────────────

export type QuerriEventType = 'ready' | 'error' | 'session-expired' | 'navigation';

export interface QuerriErrorEvent {
  code: string;
  message: string;
}

export interface QuerriNavigationEvent {
  type: 'navigation';
  path?: string;
  [key: string]: unknown;
}

export type QuerriEventCallback<T extends QuerriEventType> =
  T extends 'ready' ? (data: Record<string, never>) => void :
  T extends 'error' ? (data: QuerriErrorEvent) => void :
  T extends 'session-expired' ? (data: Record<string, never>) => void :
  T extends 'navigation' ? (data: QuerriNavigationEvent) => void :
  never;

// ─── Instance ─────────────────────────────────────────────

export interface QuerriInstance {
  readonly iframe: HTMLIFrameElement | null;
  readonly ready: boolean;
  on<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): QuerriInstance;
  off<T extends QuerriEventType>(event: T, callback: QuerriEventCallback<T>): QuerriInstance;
  destroy(): void;
}

// ─── Static API ───────────────────────────────────────────

export interface QuerriEmbedStatic {
  create(container: string | HTMLElement, options: QuerriEmbedOptions): QuerriInstance;
  readonly version: string;
}

export declare const QuerriEmbed: QuerriEmbedStatic;
export default QuerriEmbed;
