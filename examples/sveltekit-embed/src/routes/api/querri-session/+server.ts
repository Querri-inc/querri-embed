import { createSessionHandler } from '@querri/embed/server/sveltekit';
import type { RequestHandler } from './$types';

// Server-side: creates embed session using Querri API
// Set QUERRI_API_KEY and QUERRI_ORG_ID environment variables
export const POST: RequestHandler = createSessionHandler({
  resolveParams: async ({ request }) => {
    const body = await request.json();
    return {
      user: {
        external_id: body.userId || 'demo-user',
        email: body.email || 'demo@example.com',
      },
      access: body.access,
      ttl: 3600,
    };
  },
});
