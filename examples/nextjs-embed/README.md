# Next.js Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using Next.js App Router API routes.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/nextjs-embed
npm install
```

## Environment Variables

Set the following before running:

```bash
export QUERRI_API_KEY=your-api-key
export QUERRI_ORG_ID=your-org-id
```

Optionally set `NEXT_PUBLIC_QUERRI_URL` to override the default Querri server URL.

## Run

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## How It Works

**API route** (`app/api/querri-session/route.ts`):
- Handles POST requests at `/api/querri-session`
- Uses `createSessionHandler` from `@querri/embed/server/nextjs` to create embed sessions
- Resolves user identity and access params from the request body
- Returns a `session_token` for authenticating the embed iframe

**Client page** (`app/page.tsx`):
- Renders the `<QuerriEmbed>` React component (marked `'use client'`)
- Provides an `auth` config with a `fetchSessionToken` callback (memoized)
- The callback calls the API route to obtain a session token
- The embed component uses the token to authenticate with Querri

**Flow**: Page loads -> component calls `fetchSessionToken` -> POST to `/api/querri-session` -> server creates session via Querri API -> token returned -> embed iframe authenticated.
