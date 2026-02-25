# Express + Vanilla JS Querri Embed Example

Demonstrates the full end-to-end iframe auth integration using an Express server with the IIFE bundle for the client. This is the simplest setup — no framework required. Works with any backend that can run Express.

## Prerequisites

- Node.js 18+
- A Querri account with API credentials

## Setup

```bash
cd examples/express-embed
npm install
```

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

Open http://localhost:3000 in your browser.

## How It Works

**Express server** (`server.ts`):
- Serves static files from `public/`
- Mounts `createSessionHandler` from `@querri/embed/server/express` at `/api/querri-session`
- The handler creates embed sessions via the Querri API and returns a `session_token`

**Client page** (`public/index.html`):
- Loads the Querri Embed IIFE bundle via a `<script>` tag
- Uses `QuerriEmbed.create()` to mount the embed into a container div
- Provides an `auth` config with a `fetchSessionToken` callback
- The callback calls the Express endpoint to obtain a session token

**Flow**: Page loads → `QuerriEmbed.create()` calls `fetchSessionToken` → POST to `/api/querri-session` → Express middleware creates session via Querri API → token returned → embed iframe authenticated.

## When to Use This Pattern

Use this approach when:
- You have a plain Express/Node.js backend (no meta-framework)
- You want the simplest possible integration with no build step on the client
- Your frontend is vanilla HTML/JS, jQuery, or any non-framework setup
- You're prototyping or building a lightweight integration

For framework-specific integrations, see the other examples: `sveltekit-embed`, `nextjs-embed`, `react-embed`, `nuxt-embed`, `vue-embed`.
