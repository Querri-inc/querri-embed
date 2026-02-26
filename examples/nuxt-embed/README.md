# Nuxt Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using Nuxt's native server routes.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/nuxt-embed
npm install
```

## Local Development

To develop against a local copy of the SDK, replace the dependency version in `package.json`:

```json
"@querri-inc/embed": "file:../../"
```

Then re-run `npm install`.

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

Open http://localhost:3000 in your browser.

## How It Works

**Server route** (`server/api/querri-session.post.ts`):
- Handles POST requests at `/api/querri-session` (Nuxt file-based routing)
- Uses `createNuxtSessionHandler` from `@querri-inc/embed/server/nuxt` — a single one-liner export
- Creates embed sessions via the Querri API and returns a `session_token`

**Client page** (`pages/index.vue`):
- Renders the `<QuerriEmbed>` Vue component wrapped in `<ClientOnly>`
- Provides an `auth` config with a `fetchSessionToken` callback
- The callback uses Nuxt's `$fetch` to call the server route
- The embed component uses the token to authenticate with Querri

**Flow**: Page loads -> component calls `fetchSessionToken` -> POST to `/api/querri-session` -> server creates session via Querri API -> token returned -> embed iframe authenticated.
