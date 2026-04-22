<template>
  <div>
    <h1>Querri Embed - Vue + Vite Example</h1>
    <div style="width: 100%; height: 80vh">
      <QuerriEmbed
        :server-url="serverUrl"
        :auth="auth"
        @ready="() => console.log('Embed ready')"
        @error="(e) => console.error('Embed error:', e)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuerriEmbed } from '@querri-inc/embed/vue';

const serverUrl = import.meta.env.VITE_QUERRI_URL || 'https://app.querri.com';

const auth = {
  sessionEndpoint: '/api/querri-session',
};
</script>
