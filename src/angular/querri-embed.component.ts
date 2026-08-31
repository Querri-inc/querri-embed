import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { QuerriEmbed as SDK } from '../core/querri-embed.js';
import type {
  QuerriAuth,
  QuerriEmbedOptions,
  QuerriInstance,
  QuerriPrivacyConfig,
  QuerriErrorEvent,
  QuerriNavigationEvent,
  QuerriConfigAppliedEvent,
  QuerriResizeEvent,
  QuerriChatEvent,
  QuerriRecoveredEvent,
} from '../core/querri-embed.js';

/** How long config-input changes are coalesced before calling `updateConfig`. */
const CONFIG_DEBOUNCE_MS = 150;

/** Inputs that require destroying and recreating the iframe when they change. */
const REMOUNT_INPUTS = ['serverUrl', 'auth', 'startView'] as const;

/** Inputs that apply live via `updateConfig` (debounced, content-compared). */
const CONFIG_INPUTS = ['chrome', 'theme', 'privacy', 'locale'] as const;

@Component({
  selector: 'querri-embed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #container style="width:100%;height:100%"></div>',
})
export class QuerriEmbedComponent implements OnInit, OnChanges, OnDestroy {
  /** Querri server URL (e.g. 'https://app.querri.com') */
  @Input({ required: true }) serverUrl!: string;
  /** Authentication mode */
  @Input({ required: true }) auth!: QuerriAuth;
  /** Initial view path (e.g. '/dashboard/uuid', '/chat/uuid'). Changing it recreates the iframe. */
  @Input() startView?: string;
  /** Chrome visibility config. Changes apply live via updateConfig (debounced). */
  @Input() chrome?: QuerriEmbedOptions['chrome'];
  /** Theme overrides. Changes apply live via updateConfig (debounced). */
  @Input() theme?: QuerriEmbedOptions['theme'];
  /** Privacy controls. Changes apply live via updateConfig (debounced). */
  @Input() privacy?: QuerriPrivacyConfig;
  /** BCP-47 locale tag. Changes apply live via updateConfig (debounced). */
  @Input() locale?: string;
  /** Match iframe height to embedded content. Creation-time only. */
  @Input() autoHeight?: boolean;
  /** Max time (ms) to wait for the iframe's ready. Creation-time only. Default: 30000 */
  @Input() readyTimeout?: number;
  /** @deprecated Alias of readyTimeout. Creation-time only. */
  @Input() timeout?: number;

  /** Fired when embed is authenticated and ready */
  @Output() ready = new EventEmitter<Record<string, never>>();
  /** Fired on error */
  @Output() error = new EventEmitter<QuerriErrorEvent>();
  /** Fired when session expires */
  @Output() sessionExpired = new EventEmitter<Record<string, never>>();
  /** Fired on navigation inside the embed */
  @Output() navigation = new EventEmitter<QuerriNavigationEvent>();
  /** Fired when the runtime reports what config it applied (and what it changed) */
  @Output() config = new EventEmitter<QuerriConfigAppliedEvent>();
  /** Fired when the embedded content reports a new height */
  @Output() resize = new EventEmitter<QuerriResizeEvent>();
  /** Fired on chat lifecycle events (sent / finished / error) */
  @Output() chat = new EventEmitter<QuerriChatEvent>();
  /** Fired when a recoverable error (e.g. ready timeout) is retracted */
  @Output() recovered = new EventEmitter<QuerriRecoveredEvent>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private instance: QuerriInstance | null = null;
  private initialized = false;
  // Serialized config last handed to the instance — the content-compare that
  // keeps a same-content object literal from posting a no-op update.
  private appliedConfig = '';
  private configTimer: ReturnType<typeof setTimeout> | null = null;

  /** The underlying SDK instance */
  get sdkInstance(): QuerriInstance | null {
    return this.instance;
  }

  /** The iframe DOM element */
  get iframe(): HTMLIFrameElement | null {
    return this.instance?.iframe ?? null;
  }

  ngOnInit(): void {
    // Angular Universal runs ngOnInit on the server, where there is no DOM to
    // mount into — creating there throws. The browser pass creates normally.
    if (typeof window === 'undefined') return;
    this.initialized = true;
    this.createInstance();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;

    // Remount ONLY on serverUrl / auth / startView, and only when content
    // actually changed (a same-content object literal must not recreate the
    // iframe). startView is baked into the iframe URL; updateConfig does not
    // navigate. timeout/readyTimeout are creation-only: changing them is a
    // deliberate no-op.
    const remountChanged = REMOUNT_INPUTS.some((key) => {
      const change = changes[key];
      return (
        change !== undefined &&
        JSON.stringify(change.previousValue) !== JSON.stringify(change.currentValue)
      );
    });
    if (remountChanged) {
      this.createInstance();
      return;
    }

    // chrome/theme/privacy/locale apply live via updateConfig: content-compare
    // then debounce so bursts coalesce into one postMessage.
    if (CONFIG_INPUTS.some((key) => changes[key] !== undefined)) {
      this.scheduleConfigUpdate();
    }
  }

  ngOnDestroy(): void {
    this.destroyInstance();
  }

  private serializeConfig(): string {
    return JSON.stringify({
      chrome: this.chrome,
      theme: this.theme,
      privacy: this.privacy,
      locale: this.locale,
    });
  }

  private scheduleConfigUpdate(): void {
    if (!this.instance) return;
    if (this.serializeConfig() === this.appliedConfig) return;
    if (this.configTimer !== null) clearTimeout(this.configTimer);
    this.configTimer = setTimeout(() => {
      this.configTimer = null;
      if (!this.instance) return;
      this.appliedConfig = this.serializeConfig();
      // Whole-object semantics: an input back to undefined is sent as its
      // empty form so the runtime actually resets it.
      this.instance.updateConfig({
        chrome: this.chrome ?? {},
        theme: this.theme ?? {},
        privacy: this.privacy ?? {},
        locale: this.locale ?? '',
      });
    }, CONFIG_DEBOUNCE_MS);
  }

  private createInstance(): void {
    this.destroyInstance();

    this.instance = SDK.create(this.containerRef.nativeElement, {
      serverUrl: this.serverUrl,
      auth: this.auth,
      startView: this.startView,
      chrome: this.chrome,
      theme: this.theme,
      privacy: this.privacy,
      locale: this.locale,
      autoHeight: this.autoHeight,
      readyTimeout: this.readyTimeout,
      timeout: this.timeout,
    });
    this.appliedConfig = this.serializeConfig();

    this.instance
      .on('ready', (d) => this.ready.emit(d))
      .on('error', (d) => this.error.emit(d))
      .on('session-expired', (d) => this.sessionExpired.emit(d))
      .on('navigation', (d) => this.navigation.emit(d))
      .on('config', (d) => this.config.emit(d))
      .on('resize', (d) => this.resize.emit(d))
      .on('chat', (d) => this.chat.emit(d))
      .on('recovered', (d) => this.recovered.emit(d));
  }

  private destroyInstance(): void {
    if (this.configTimer !== null) {
      clearTimeout(this.configTimer);
      this.configTimer = null;
    }
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
