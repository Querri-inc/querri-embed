# Vue + Vite Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using Vue 3 with the `<QuerriEmbed>` component and an Express API server. This is the standalone Vue setup — no meta-framework required.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/vue-embed
npm install
```

## Local Development

To develop against a local copy of the SDK, replace the dependency version in `package.json`:

```json
"@querri-inc/embed": "file:../../"
```

Then re-run `npm install`.

## Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Or set them directly:

```bash
export QUERRI_API_KEY=your-api-key
export QUERRI_ORG_ID=your-org-id
```

## Run

```bash
npm run dev
```

This starts both the Vite dev server (port 3000) and the Express API server (port 3001). Vite proxies `/api` requests to Express.

Open http://localhost:3000 in your browser.

## How It Works

**Express API server** (`server.js`):
- Creates a `Querri` client from `@querri-inc/embed/server`
- Exposes `POST /api/querri-session` which calls `client.getSession()` and returns a `session_token`

**Vue client** (`src/App.vue`):
- Imports `<QuerriEmbed>` from `@querri-inc/embed/vue`
- Provides an `auth` config with a `fetchSessionToken` callback
- The callback calls the Express endpoint to obtain a session token

**Flow**: Page loads → `<QuerriEmbed>` calls `fetchSessionToken` → POST to `/api/querri-session` → Express creates session via Querri API → token returned → embed iframe authenticated.

## When to Use This Pattern

Use this approach when:
- You have a Vue 3 + Vite frontend with a separate Express/Node.js backend
- You're not using Nuxt and don't want a meta-framework
- You want direct control over your server and client setup

For Nuxt integration, see the `nuxt-embed` example. For other frameworks, see `sveltekit-embed`, `nextjs-embed`, `react-embed`, `express-embed`.
