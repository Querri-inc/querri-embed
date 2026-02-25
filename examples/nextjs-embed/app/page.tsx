'use client';
import { QuerriEmbed } from '@querri/embed/react';
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
    <main>
      <h1>Querri Embed - Next.js Example</h1>
      <div style={{ width: '100%', height: '80vh' }}>
        <QuerriEmbed
          serverUrl={process.env.NEXT_PUBLIC_QUERRI_URL || 'https://app.querri.com'}
          auth={auth}
          onReady={() => console.log('Embed ready')}
          onError={(err) => console.error('Embed error:', err)}
        />
      </div>
    </main>
  );
}
