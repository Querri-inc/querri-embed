# React Router Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using React Router v7 framework mode with native resource routes.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/react-embed
npm install
```

## Environment Variables

Set the following before running:

```bash
export QUERRI_API_KEY=your-api-key
export QUERRI_ORG_ID=your-org-id
```

## Run

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

**Resource route** (`app/routes/api.querri-session.ts`):
- Exports an `action` function that handles POST requests at `/api/querri-session`
- Uses `createSessionAction` from `@querri/embed/server/react-router` to create embed sessions
- No default component export = resource route (API-only, no UI rendered)
- Resolves user identity and access params from the request body
- Returns a `session_token` for authenticating the embed iframe

**Client page** (`app/routes/_index.tsx`):
- Renders the `<QuerriEmbed>` React component from `@querri/embed/react`
- Provides an `auth` config with a `fetchSessionToken` callback (memoized with `useMemo`)
- The callback calls the resource route to obtain a session token
- The embed component uses the token to authenticate with Querri

**Flow**: Page loads → component calls `fetchSessionToken` → POST to `/api/querri-session` → resource route action creates session via Querri API → token returned → embed iframe authenticated.

## React Router v7 Resource Routes

In React Router v7, any route file that exports `action` or `loader` but **does not** export a default component is treated as a "resource route" — it only handles data, not UI. This is the equivalent of SvelteKit's `+server.ts` or Next.js App Router's `route.ts`.

File naming uses dot notation for path segments:
- `api.querri-session.ts` → `/api/querri-session`
- `api.users.$id.ts` → `/api/users/:id`
