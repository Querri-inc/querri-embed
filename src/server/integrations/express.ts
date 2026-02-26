// Re-exports from the Angular/Express integration module.
// This provides a clearer import path for non-Angular Express projects:
//   import { createSessionHandler } from '@querri-inc/embed/server/express';
export {
  createQuerriMiddleware,
  createSessionHandler,
  createQuerriClient,
  type QuerriMiddlewareOptions,
} from './angular.js';
