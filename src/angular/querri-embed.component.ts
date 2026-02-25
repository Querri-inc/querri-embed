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
  QuerriChromeConfig,
  QuerriInstance,
  QuerriErrorEvent,
  QuerriNavigationEvent,
} from '../core/querri-embed.js';

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
  /** Initial view path (e.g. '/builder/dashboard/uuid') */
  @Input() startView?: string;
  /** Chrome visibility config */
  @Input() chrome?: QuerriChromeConfig;
  /** Theme overrides */
  @Input() theme?: Record<string, unknown>;
  /** Maximum time (ms) to wait for iframe to respond. Default: 15000 */
  @Input() timeout?: number;

  /** Fired when embed is authenticated and ready */
  @Output() ready = new EventEmitter<Record<string, never>>();
  /** Fired on error */
  @Output() error = new EventEmitter<QuerriErrorEvent>();
  /** Fired when session expires */
  @Output() sessionExpired = new EventEmitter<Record<string, never>>();
  /** Fired on navigation inside the embed */
  @Output() navigation = new EventEmitter<QuerriNavigationEvent>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private instance: QuerriInstance | null = null;
  private initialized = false;

  /** The underlying SDK instance */
  get sdkInstance(): QuerriInstance | null {
    return this.instance;
  }

  /** The iframe DOM element */
  get iframe(): HTMLIFrameElement | null {
    return this.instance?.iframe ?? null;
  }

  ngOnInit(): void {
    this.initialized = true;
    this.createInstance();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (
      changes['serverUrl'] ||
      changes['auth'] ||
      changes['startView'] ||
      changes['chrome'] ||
      changes['theme'] ||
      changes['timeout']
    ) {
      this.createInstance();
    }
  }

  ngOnDestroy(): void {
    this.destroyInstance();
  }

  private createInstance(): void {
    this.destroyInstance();

    this.instance = SDK.create(this.containerRef.nativeElement, {
      serverUrl: this.serverUrl,
      auth: this.auth,
      startView: this.startView,
      chrome: this.chrome,
      theme: this.theme,
      timeout: this.timeout,
    });

    this.instance
      .on('ready', (d) => this.ready.emit(d))
      .on('error', (d) => this.error.emit(d))
      .on('session-expired', (d) => this.sessionExpired.emit(d))
      .on('navigation', (d) => this.navigation.emit(d));
  }

  private destroyInstance(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
