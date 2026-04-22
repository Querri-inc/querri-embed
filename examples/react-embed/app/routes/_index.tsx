import { QuerriEmbed } from '@querri-inc/embed/react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const auth = useMemo(() => ({
    sessionEndpoint: '/api/querri-session',
  }), []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Querri Embed - React Router Example</h1>
      <p>
        This example uses React Router v7 framework mode with a native resource
        route for session creation — no separate backend server needed.
      </p>
      <QuerriEmbed
        style={{ width: '100%', height: '80vh', marginTop: '1rem' }}
        serverUrl={import.meta.env.VITE_QUERRI_URL || 'https://app.querri.com'}
        auth={auth}
        onReady={() => console.log('Embed ready')}
        onError={(err) => console.error('Embed error:', err)}
      />
    </main>
  );
}
