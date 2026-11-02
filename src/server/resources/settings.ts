import { BaseResource } from './base-resource.js';
import type { SettingsContext } from '../types.js';

export class SettingsResource extends BaseResource {
  /** The same document the app's `GET /api/settings/context` returns. */
  getContext(): Promise<SettingsContext> {
    return this._get<SettingsContext>('/settings/context');
  }
}
