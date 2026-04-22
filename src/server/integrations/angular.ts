// Angular SSR runs on Express, so the implementation lives in express.ts.
// This module re-exports it under the Angular-specific import path:
//   import { createSessionHandler } from '@querri-inc/embed/server/angular';
export {
  createQuerriMiddleware,
  createSessionHandler,
  createQuerriClient,
  type QuerriMiddlewareOptions,
} from './express.js';
