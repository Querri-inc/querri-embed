import { QuerriEmbed } from '@querri-inc/embed/react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const auth = useMemo(() => ({
    fetchSessionToken: async () => {
      const res = await fetch('/api/querri-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      });
      const { session_token } = await res.json();
      return session_token;
    },
  }), []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Querri Embed - React Router Example</h1>
      <p>
        This example uses React Router v7 framework mode with a native resource
        route for session creation — no separate backend server needed.
      </p>
      <div style={{ width: '100%', height: '80vh', marginTop: '1rem' }}>
        <QuerriEmbed
          serverUrl={import.meta.env.VITE_QUERRI_URL || 'https://app.querri.com'}
          auth={auth}
          onReady={() => console.log('Embed ready')}
          onError={(err) => console.error('Embed error:', err)}
        />
      </div>
    </main>
  );
}
