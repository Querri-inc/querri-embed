import { BaseResource } from './base-resource.js';
import type { FlagMap } from '../types.js';

export class FlagsResource extends BaseResource {
  /** Decided flag values for the caller's org, keyed by flag key. Read only. */
  async list(): Promise<FlagMap> {
    const res = await this._get<{ data: FlagMap }>('/flags');
    return res.data;
  }
}
