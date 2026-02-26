<script>
  import { QuerriEmbed } from '@querri-inc/embed/svelte';
  import { env } from '$env/dynamic/public';

  const PUBLIC_QUERRI_URL = env.PUBLIC_QUERRI_URL || 'https://app.querri.com';

  const auth = {
    fetchSessionToken: async () => {
      const res = await fetch('/api/querri-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      });
      const { session_token } = await res.json();
      return session_token;
    },
  };
</script>

<h1>Querri Embed - SvelteKit Example</h1>
<div style="width: 100%; height: 80vh;">
  <QuerriEmbed
    serverUrl={PUBLIC_QUERRI_URL}
    {auth}
    on:ready={() => console.log('Embed ready')}
    on:error={(e) => console.error('Embed error:', e.detail)}
  />
</div>
