import { BaseResource } from './base-resource.js';
import { CursorPage } from '../pagination/cursor-page.js';
import type { AuditEvent, AuditListParams } from '../types.js';

export class AuditResource extends BaseResource {
  list(params?: AuditListParams): Promise<CursorPage<AuditEvent>> {
    return this._list<AuditEvent>(
      '/audit/events',
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
