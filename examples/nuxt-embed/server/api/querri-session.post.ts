import { createSessionHandler } from '@querri-inc/embed/server/nuxt';

export default createSessionHandler({
  resolveParams: async () => ({
    user: {
      external_id: 'demo-user',
      email: 'demo@example.com',
    },
    ttl: 3600,
  }),
});
