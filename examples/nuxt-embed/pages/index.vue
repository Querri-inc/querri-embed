<template>
  <div>
    <h1>Querri Embed - Nuxt Example</h1>
    <div style="width: 100%; height: 80vh">
      <ClientOnly>
        <QuerriEmbed
          :server-url="serverUrl"
          :auth="auth"
          @ready="() => console.log('Embed ready')"
          @error="(e) => console.error('Embed error:', e)"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
import { QuerriEmbed } from '@querri/embed/vue';

const config = useRuntimeConfig();
const serverUrl = config.public.querriUrl as string || 'https://app.querri.com';

const auth = {
  fetchSessionToken: async () => {
    const { session_token } = await $fetch('/api/querri-session', {
      method: 'POST',
      body: { userId: 'demo-user' },
    });
    return session_token;
  },
};
</script>
