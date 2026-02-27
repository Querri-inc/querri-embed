'use client';
import { QuerriEmbed } from '@querri-inc/embed/react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const auth = useMemo(() => ({
    sessionEndpoint: '/api/querri-session',
  }), []);

  return (
    <main>
      <h1>Querri Embed - Next.js Example</h1>
      <QuerriEmbed
        style={{ width: '100%', height: '80vh' }}
        serverUrl={process.env.NEXT_PUBLIC_QUERRI_URL || 'https://app.querri.com'}
        auth={auth}
        onReady={() => console.log('Embed ready')}
        onError={(err) => console.error('Embed error:', err)}
      />
    </main>
  );
}
