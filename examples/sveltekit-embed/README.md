# SvelteKit Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using SvelteKit's native server routes.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/sveltekit-embed
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

**Server route** (`src/routes/api/querri-session/+server.ts`):
- Handles POST requests at `/api/querri-session`
- Uses `createSessionHandler` from `@querri-inc/embed/server/sveltekit` to create embed sessions
- Resolves user identity and access params from the request body
- Returns a `session_token` for authenticating the embed iframe

**Client page** (`src/routes/+page.svelte`):
- Renders the `<QuerriEmbed>` Svelte component
- Provides an `auth` config with a `fetchSessionToken` callback
- The callback calls the server route to obtain a session token
- The embed component uses the token to authenticate with Querri

**Flow**: Page loads -> component calls `fetchSessionToken` -> POST to `/api/querri-session` -> server creates session via Querri API -> token returned -> embed iframe authenticated.
