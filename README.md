# @querri/embed

Embed Querri views in your application. Works with vanilla JavaScript, React, Vue, Svelte, and Angular.

## Installation

```bash
npm install @querri/embed
```

## Quick Start

### Vanilla JavaScript

```javascript
import { QuerriEmbed } from '@querri/embed';

const querri = QuerriEmbed.create('#container', {
  serverUrl: 'https://app.querri.com',
  auth: { shareKey: 'your-share-key', org: 'your-org-id' },
  startView: '/builder/dashboard/your-dashboard-uuid',
});

querri.on('ready', () => console.log('Embed loaded'));
querri.on('error', (err) => console.error(err.code, err.message));
```

### React

```tsx
import { useMemo } from 'react';
import { QuerriEmbed } from '@querri/embed/react';

function App() {
  // Memoize auth to prevent unnecessary iframe recreation
  const auth = useMemo(() => ({ shareKey: 'your-share-key', org: 'your-org-id' }), []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <QuerriEmbed
        serverUrl="https://app.querri.com"
        auth={auth}
        startView="/builder/dashboard/your-dashboard-uuid"
        onReady={() => console.log('Loaded')}
        onError={(err) => console.error(err)}
      />
    </div>
  );
}
```

### Vue

```vue
<template>
  <div style="width: 100%; height: 600px">
    <QuerriEmbed
      server-url="https://app.querri.com"
      :auth="auth"
      start-view="/builder/dashboard/your-dashboard-uuid"
      @ready="onReady"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { QuerriEmbed } from '@querri/embed/vue';

const auth = { shareKey: 'your-share-key', org: 'your-org-id' };

function onReady() { console.log('Loaded'); }
function onError(err) { console.error(err); }
</script>
```

### Svelte

```svelte
<script>
  import { QuerriEmbed } from '@querri/embed/svelte';

  const auth = { shareKey: 'your-share-key', org: 'your-org-id' };
</script>

<div style="width: 100%; height: 600px">
  <QuerriEmbed
    serverUrl="https://app.querri.com"
    {auth}
    startView="/builder/dashboard/your-dashboard-uuid"
    on:ready={() => console.log('Loaded')}
    on:error={(e) => console.error(e.detail)}
  />
</div>
```

### Angular

```typescript
import { Component } from '@angular/core';
import { QuerriEmbedComponent, type QuerriAuth } from '@querri/embed/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [QuerriEmbedComponent],
  template: `
    <div style="width: 100%; height: 600px">
      <querri-embed
        [serverUrl]="'https://app.querri.com'"
        [auth]="auth"
        [startView]="'/builder/dashboard/your-dashboard-uuid'"
        (ready)="onReady()"
        (error)="onError($event)"
      />
    </div>
  `,
})
export class DashboardComponent {
  auth: QuerriAuth = { shareKey: 'your-share-key', org: 'your-org-id' };

  onReady() { console.log('Loaded'); }
  onError(err: any) { console.error(err); }
}
```

### Script Tag (CDN)

```html
<script src="https://unpkg.com/@querri/embed/dist/core/querri-embed.iife.global.js"></script>
<script>
  var querri = QuerriEmbed.create('#container', {
    serverUrl: 'https://app.querri.com',
    auth: { shareKey: 'your-share-key', org: 'your-org-id' },
  });
</script>
```

## Authentication Modes

### Share Key (Public Embeds)

For publicly shared dashboards. No user login required.

```javascript
auth: {
  shareKey: 'abc123',  // From your dashboard's share link
  org: 'org_456',      // Your organization ID
}
```

### Server Token (Enterprise)

Your backend exchanges an API key for a session token. The token is passed to the embed.

```javascript
auth: {
  fetchSessionToken: async () => {
    const res = await fetch('/api/querri-token');
    const { sessionToken } = await res.json();
    return sessionToken;
  },
}
```

### Popup Login (User Accounts)

Users authenticate via a popup window. Session tokens are cached in localStorage.

```javascript
auth: 'login'
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `serverUrl` | `string` | Yes | Querri server URL (e.g. `'https://app.querri.com'`) |
| `auth` | `QuerriAuth` | Yes | Authentication mode (see above) |
| `startView` | `string` | No | Initial view path (e.g. `'/builder/dashboard/uuid'`) |
| `chrome` | `object` | No | UI chrome visibility |
| `chrome.sidebar` | `{ show?: boolean }` | No | Sidebar visibility (default: hidden) |
| `chrome.header` | `{ show?: boolean }` | No | Header visibility (default: shown) |
| `theme` | `object` | No | Theme overrides |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `{}` | Embed authenticated and ready |
| `error` | `{ code, message }` | An error occurred |
| `session-expired` | `{}` | Session token expired |
| `navigation` | `{ type, path?, ... }` | User navigated within the embed |

### Error Codes

| Code | Meaning |
|------|---------|
| `invalid_auth` | Auth config is invalid |
| `token_fetch_failed` | `fetchSessionToken` callback failed |
| `popup_blocked` | Browser blocked the login popup |
| `auth_failed` | Authentication failed after popup login |
| `auth_required` | Auth required but no login mode configured |
| `timeout` | Iframe didn't respond within 15 seconds |

## Instance API

```javascript
const querri = QuerriEmbed.create('#container', options);

querri.on('ready', callback);     // Subscribe to event (chainable)
querri.off('ready', callback);    // Unsubscribe (chainable)
querri.destroy();                 // Clean up iframe and listeners

querri.ready;    // boolean — true when authenticated
querri.iframe;   // HTMLIFrameElement | null

QuerriEmbed.version;  // SDK version string (e.g. '0.1.0')
```

## Framework Component API

### React

The React component accepts all SDK options as props, plus:

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | CSS class for the container div |
| `style` | `CSSProperties` | Inline styles for the container div |
| `onReady` | `() => void` | Ready callback |
| `onError` | `(err) => void` | Error callback |
| `onSessionExpired` | `() => void` | Session expired callback |
| `onNavigation` | `(data) => void` | Navigation callback |

Access the underlying instance via ref:

```tsx
import { useRef } from 'react';
import { QuerriEmbed, type QuerriEmbedRef } from '@querri/embed/react';

const ref = useRef<QuerriEmbedRef>(null);
// ref.current.instance — SDK instance
// ref.current.iframe — iframe element
<QuerriEmbed ref={ref} ... />
```

### Vue

Events: `@ready`, `@error`, `@session-expired`, `@navigation`

Access the underlying instance via template ref:

```vue
<QuerriEmbed ref="embedRef" ... />
<!-- embedRef.instance / embedRef.iframe -->
```

### Svelte

Events: `on:ready`, `on:error`, `on:session-expired`, `on:navigation`

Access the underlying instance via `bind:this`:

```svelte
<QuerriEmbed bind:this={embed} ... />
<!-- embed.getInstance() / embed.getIframe() -->
```

### Angular

Inputs: `serverUrl`, `auth`, `startView`, `chrome`, `theme`

Events: `(ready)`, `(error)`, `(sessionExpired)`, `(navigation)`

Access the underlying instance via a template ref or `ViewChild`:

```typescript
@ViewChild(QuerriEmbedComponent) embed!: QuerriEmbedComponent;
// embed.sdkInstance — SDK instance
// embed.iframe — iframe element
```

## TypeScript

All types are exported from every entry point:

```typescript
import type {
  QuerriAuth,
  QuerriShareKeyAuth,
  QuerriTokenAuth,
  QuerriChromeConfig,
  QuerriEmbedOptions,
  QuerriInstance,
  QuerriEventType,
  QuerriEventCallback,
  QuerriErrorEvent,
  QuerriNavigationEvent,
} from '@querri/embed';

// Framework wrappers re-export all core types, plus their own:
import type { QuerriEmbedProps, QuerriEmbedRef } from '@querri/embed/react';
```

## Requirements

The core SDK has **zero dependencies** and works in any modern browser.

Framework wrappers require:

| Framework | Minimum Version |
|-----------|----------------|
| React | >= 17 |
| Vue | >= 3.2 |
| Svelte | >= 4 |
| Angular | >= 17 |

All framework dependencies are optional — install only what you use.

## Important Notes

- The container element must have explicit dimensions (width and height). The iframe fills 100% of its container.
- **React/Vue/Angular:** Memoize the `auth` prop if it's an object. A new object reference on every render/change detection cycle will cause the iframe to be destroyed and recreated.
- All framework wrappers automatically clean up the iframe on unmount.

## License

MIT
