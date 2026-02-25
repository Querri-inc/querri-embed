import { BaseResource } from './base-resource.js';
import type { UsageReport } from '../types.js';

export class UsageResource extends BaseResource {
  orgUsage(period?: string): Promise<UsageReport> {
    return this._get<UsageReport>('/usage', {
      period: period ?? 'current_month',
    });
  }

  userUsage(userId: string, period?: string): Promise<UsageReport> {
    return this._get<UsageReport>(`/usage/users/${userId}`, {
      period: period ?? 'current_month',
    });
  }
}
