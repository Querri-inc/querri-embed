import { createSessionAction } from '@querri-inc/embed/server/react-router';

/**
 * Resource route — no default component export, so this is API-only.
 * POST /api/querri-session
 */
export const action = createSessionAction({
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
