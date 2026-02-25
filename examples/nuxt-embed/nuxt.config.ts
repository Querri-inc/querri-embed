export default defineNuxtConfig({
  compatibilityDate: '2024-01-01',
  runtimeConfig: {
    public: {
      querriUrl: process.env.NUXT_PUBLIC_QUERRI_URL || 'https://app.querri.com',
    },
  },
});
