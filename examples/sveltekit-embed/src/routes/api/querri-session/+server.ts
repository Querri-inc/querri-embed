import { createSessionHandler } from '@querri-inc/embed/server/sveltekit';
import type { RequestHandler } from './$types';

// Server-side: creates embed session using Querri API
// Set QUERRI_API_KEY and QUERRI_ORG_ID environment variables
export const POST: RequestHandler = createSessionHandler({
  resolveParams: async () => ({
    user: {
      external_id: 'demo-user',
      email: 'demo@example.com',
    },
    ttl: 3600,
  }),
});
