import { createSessionHandler } from '@querri-inc/embed/server/react-router';

/**
 * Resource route — no default component export, so this is API-only.
 * POST /api/querri-session
 */
export const action = createSessionHandler({
  resolveParams: async () => ({
    user: {
      external_id: 'demo-user',
      email: 'demo@example.com',
    },
    ttl: 3600,
  }),
});
