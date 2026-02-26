import { createSessionHandler } from '@querri-inc/embed/server/nextjs';

export const POST = createSessionHandler({
  resolveParams: async (req) => {
    const body = await req.json();
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
