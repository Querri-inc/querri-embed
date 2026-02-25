import { BaseResource } from './base-resource.js';
import type { AuditEvent, AuditListParams } from '../types.js';

export class AuditResource extends BaseResource {
  list(params?: AuditListParams): Promise<AuditEvent[]> {
    return this._get<AuditEvent[]>('/audit/events', params as Record<string, string | number | boolean | undefined>);
  }
}
