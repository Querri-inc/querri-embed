# Changelog

All notable changes to `@querri-inc/embed` are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Prior to `1.0.0`, minor version bumps may contain breaking changes.

## [Unreleased]

## [1.1.0] — Unreleased

Custom Roles support, and the server SDK now reads the errors the API actually
sends. Additive only, with one behaviour change in the browser build: a
`sessionEndpoint` 4xx refusal is no longer retried (see Changed).

### Added
- **Custom Roles on embed sessions.** `getSession({ role })` and
  `embed.createSession({ role })` take a role id or key the session runs as;
  the key is sent only when it is a non-empty string (`null` and `''` are not
  sent). `getSession()` returns the applied `role_id` (`null` when no role was
  requested — or when a server too old to know Custom Roles ignored `role`, so
  check `role_id` when the role matters); `EmbedSession`,
  `EmbedSessionListItem` and the refresh response carry `role_id?` when the
  session has one. `role` is distinct from `user.role`, the org role used when
  creating the user. A grant is permanent: it adds the role to the user's role
  assignment, and revoking the session does not remove it.
- `APIError.permission` and `APIError.reason` for `403 permission_denied`
  refusals. `permission` falls back to the `X-Permission-Denied` header only
  when it holds a permission key (contains a `.`) and the refusal's code is
  `permission_denied` or absent; the server puts the error code there when no
  single permission applies. New `PermissionDeniedReason` type
  (`role_denied`, `not_in_plan`, `flag_off`, `embed_disabled`,
  `dependency_unmet`, `forbidden`, `scope_exceeds_role`).
- `ERROR_CODES` (frozen; literal types kept) and the `ErrorCode` type,
  exported from `@querri-inc/embed/server`: the auth, permission, Custom Role,
  embed session and user-change codes, including `escalation_denied` (403),
  `last_admin` (409) and `invalid_parameters` (400).
- Session handlers (`nextjs`, `sveltekit`, `react-router`, `nuxt`, `express` /
  `angular`) answer a refusal with Querri's status and
  `{ error, code, permission, reason, doc_url }` (keys that do not apply are
  omitted). The `SessionErrorBody` type is exported from each integration
  entry point.
- Browser: in `sessionEndpoint` mode a failed endpoint response is reported on
  `token_fetch_failed` with `detail: { status, code?, permission?, reason? }`
  read from the endpoint's JSON, and the message names the code
  (`Session endpoint returned 403 (role_disabled)`). The Nuxt handler's h3
  error body (fields under `data`) is read too. `detail` is only ever the
  endpoint's; an error thrown by a custom `fetchSessionToken` is reported
  without one. New `QuerriErrorDetail` type.
- Typings: `QuerriErrorCode` gains `view_error` (a page inside the embed failed
  to render; `QuerriErrorEvent.status` carries its HTTP status) and
  `preview_escaped` (embed configurator only, `recoverable`).
- Docs: error-code table, valid API-key scope names, `embed:role:assign`
  (included in `*`), and whom a key acts for: its scopes are what its creator
  *and* its bound user both hold, and on servers released after 2026-10-21 so
  are its embed role grants and `/v1` user-role changes (before: its bound
  user, else its creator). The key-creation rules — capped by creator and
  bound user (`scope_exceeds_role`), only an Admin binds a key to someone else,
  no pseudo `bound_user_id`, and a key minted by a key keeping its parent's
  creator, bound user, workspace, sources (equal or narrower), access policies
  (the same set), IP allow-list (inside the parent's), expiry and rate-limit
  cap. The `/v1` users role guards: `users.create()`, `update()`, `del()` and
  `getOrCreate()` — and `getSession()` for a new user — can be refused with
  `escalation_denied` (`missing` in the raw body) or `last_admin`. Where a
  refusal lists `scopes` / `missing`, the docs say they are in
  `err.body.detail.error`. The refresh/list `role_id` echo, the key-creation
  rules and the user guards need a Querri server released after 2026-10-21.

### Changed
- Browser: in `sessionEndpoint` mode a 4xx answer other than 408 and 429 is
  not retried. It is the host's (or Querri's) deliberate refusal — e.g.
  `role_disabled` — and retrying re-ran the host's `getSession()` three times
  for the same answer. `token_fetch_failed` now fires after the first answer,
  with its `detail`. 408, 429, 5xx, network failures and every error from a
  custom `fetchSessionToken` still get 3 attempts (retries after 1s and 2s).

### Fixed
- **The server SDK never unwrapped FastAPI's `{"detail": …}` envelope**, so
  every real `/v1` error had `code`, `type` and `docUrl` undefined and the
  message "Request failed with status N". `APIError` now reads
  `{detail: {error: {…}}}`, `{detail: {…}}`, the flat
  `{detail: {error: '<code>', message: '<text>'}}` (code from `error`, message
  from `message`) and `{detail: "text"}`; `body` stays the raw wire body.
  A string or list `detail` beside a top-level `error` is left alone, so
  `{error: 'x', detail: 'y'}` still reads as in 1.0.1, and a code is taken from
  a flat `error` string only inside `detail` — a top-level legacy
  `{error: 'forbidden'}` is a message, not a code.
- An `X-Permission-Denied` header no longer sets `APIError.permission` on a
  refusal that is not `permission_denied` (e.g. `escalation_denied`).
- `422` validation errors throw `ValidationError` (status 422) with a readable
  message (`Validation failed: body.ttl: Input should be greater than or equal
  to 900`) instead of a bare `APIError`.
- Nuxt: `defineQuerriSessionHandler` rethrew the raw `APIError`, so wrapped in
  `defineEventHandler` h3 answered 500 without the code. It now throws an h3
  error with Querri's status and the same `SessionErrorBody` as
  `createSessionHandler` (as `data`); its signature is unchanged. It needs `h3`
  importable (or passed as `options.h3`); without it the `APIError` is
  rethrown as before.
- Svelte typings: the hand-written `@querri-inc/embed/svelte` declarations did
  not export `QuerriErrorDetail` or `QuerriErrorCode` (nor several other types
  the other entries export). They now export the same type list as
  `src/svelte/index.ts`, checked by a build test.
- Typings: `chrome.header.chartRenderer` (default `false`) and
  `chrome.dashboard.export` (default `true`). The runtime added the first and
  moved the second to phase 3 after 1.0.1; the vendored schema predated both,
  so a typed config setting either failed the excess-property check. The schema
  is byte-identical to the served one again.
- Typings: `User.role` is documented as the org role, `'admin'` or `'member'`
  (it said `'viewer'` / `'editor'` / `'admin'`).
- Docs: the keys example used scope names that do not exist (`read:data`,
  `write:projects`); the README error table listed 7 of the 14 codes (it now
  lists all 16); the `timeout` row said the default was 15s (it is 30s);
  `startView` now documents its `'/home'` default; the README said
  `token_fetch_failed` came "after 3 automatic retries" (it is 3 attempts:
  2 retries, at 1s and 2s).
- Docs: the Nuxt and Express / Angular session examples built `external_id`,
  `email` and the tenant filter from the request body (`body.userId`), which
  lets any visitor pick whom to embed as. They now take the user from the
  server's own auth, and the browser examples POST without a body. The Nuxt
  example is type-correct.
- Docs: Svelte delivers the error event's payload as `e.detail`, so a
  `sessionEndpoint` refusal's own detail is `e.detail.detail`.

### Note
- The browser build changed (`sessionEndpoint` error detail, no retry on a 4xx
  refusal). Your Querri deployment serves its own copy at
  `/sdk/querri-embed.js`; it picks this up when the deployment re-vendors
  1.1.0.

## [1.0.1] — 2026-09-28

No change to runtime behaviour: the browser build differs from 1.0.0 only in its
`version` string.

### Fixed
- Typings: `chrome.rail.items.sites` (default `true`) and
  `chrome.rail.items.connectors` (default `false`). The runtime added both after
  1.0.0 and serves them in `{serverUrl}/sdk/chrome-schema.json`. The vendored
  schema predated them, so a typed config setting either failed the
  excess-property check. The schema is byte-identical to the served one again.
- "Missing API key" (the server integrations' `ConfigError`, and the README)
  pointed at `app.querri.com/settings/api-keys`, which was never a page. Keys are
  created at `/settings/api`, by an org admin.

## [1.0.0] — 2026-08-31

The first major: this package becomes the **single source** of the browser SDK —
the file your Querri deployment serves at `/sdk/querri-embed.js` is now the
unminified build of this core, so the two can never fork again (they had:
sixteen weeks apart, both claiming 0.2.1). See `docs/MIGRATION.md`.

### Added
- `updateConfig(config)` — live config changes with **replace** semantics.
- Events: `config` (what the runtime applied/dropped/coupled), `resize`
  (+`autoHeight` option), `chat`, `recovered`.
- `sendPrompt` resolves `Promise<{ ok, message }>` via `send-prompt-result`,
  correlated by a `promptId` echo (concurrent calls resolve correctly, and a
  pending call settles `ok: false` when the instance is destroyed).
- Options: `privacy`, `locale`, `autoHeight`, `readyTimeout`; init carries
  `schemaVersion: 2`.
- Typings generated from the runtime's chrome schema (~180 v2 keys, enums as
  unions), with a regen-check test and a scheduled drift check against
  `{product}/sdk/chrome-schema.json` (`npm run check:schema`).
- Origin pinning: the iframe URL carries `parentOrigin=`; inbound messages are
  source-checked; the popup close-poll is COOP-safe.
- Server SDK: `sources.update` typed to the real request/response;
  `orgShareSource` response typed `{ source_id, org_shared }`.

### Changed (breaking)
- `timeout` → `readyTimeout`: default **30000** (was 15000), `0` now disables
  (previously fell back to the default), the error is `recoverable: true`, and
  a late `ready` emits `recovered`. `timeout` remains as a deprecated alias.
- `sendPrompt` returns a Promise instead of emitting `send_prompt_failed`
  error events for local refusals.
- Unset `startView` now opens the runtime's default view instead of forcing
  `'/home'` (matches the served asset's behaviour).
- Framework wrappers no longer destroy/recreate the iframe on `chrome`/`theme`
  changes — they call `updateConfig` (debounced, content-compared). Remount
  happens only for `serverUrl`/`auth`/`startView`; changing
  `timeout`/`readyTimeout` no longer remounts.
- Server SDK: `data.*` repointed from the deleted `/data/*` routes to
  `/sources/*` (`query` moves `source_id` into the path);
  `SourceCreateParams` is `{ name, rows }`; the user client (`asUser`) targets
  `/api/v1` and its dashboards surface is read-only.
- Typings: `theme.scheme` and `chrome.chat.skills` deleted (dead on the
  runtime); legacy v1 chrome interfaces are `@deprecated` aliases;
  `QuerriEventType`/`QuerriErrorCode` widened to what the runtime emits.
- The wire config no longer duplicates `chat.fasterAnalysis` onto
  `experimentalV2` — the runtime aliases legacy keys itself.

### Fixed
- 15s terminal timeout falsely failing slow-network embeds that were about to
  work (measured 24.8s on Fast 3G).
- The IIFE global unwrap now works under function-scoped evaluation (the
  product's asset tests), not only as a top-level `<script>`.
- The published `svelte` export resolves: the tarball now ships the core
  module the `.svelte` source imports (0.x published a dangling import chain,
  so SvelteKit consumers failed at build).
- A config change landing between `init` and `authenticated` is posted
  instead of silently swallowed (the send gate is frame-liveness, not auth).
- The Angular wrapper no-ops under Angular Universal instead of throwing.


## [0.2.1] — 2026-05-11

### Added

- **`QuerriHeaderConfig` exposes per-control header toggles**
  (`src/core/querri-embed.d.ts`): `viewModeToggle`, `share`, `print`,
  `automate`, `settings`, `menu`. These keys were already honored at
  runtime via the SDK's `chrome` passthrough, but the TypeScript type
  only declared `show`. Integrators can now hide individual project /
  dashboard header buttons via the typed API. Backwards-compatible —
  all keys default to `true`.
- **`QuerriChatConfig`** (`src/core/querri-embed.d.ts`) types the
  `chrome.chat` surface that the staging frontend has read all along:
  `fullWidth`, `connectData`, `extendedThinking`, `simpleMode`,
  `skills`, `fasterAnalysis`, plus nested `display`, `reasoning`, and
  `welcome` (with `promptButtons`). All keys are passthrough — runtime
  behavior is unchanged. Integrators can now drive chat surfaces from
  TypeScript directly.
- **`QuerriThemeConfig`** replaces the loose `theme: Record<string, unknown>`
  with `{ scheme?: 'light' \| 'dark' \| null; colors?: Record<string, string> }`.
  Keys in `colors` must begin with `--` and are applied to
  `document.documentElement.style`. The canonical `--ui-*` token list
  lives in the staging app's `layout.css`.

### Changed

- **`chat.experimentalV2` renamed to `chat.fasterAnalysis`** to match
  the existing "Faster analysis mode" tooltip. The old key is still
  accepted by both the SDK and the staging frontend as a legacy alias
  and will be removed in the next major release.
  - SDK side: `_buildConfig` aliases `fasterAnalysis` → `experimentalV2`
    on the wire so a renamed SDK keeps working against older staging
    builds (`src/core/querri-embed.js`).
  - Staging side: `routes/embed/(sdk)/+layout.svelte` accepts incoming
    `experimentalV2` and copies it to `fasterAnalysis` before merging,
    so older SDKs keep working against the renamed frontend.
  - The chat-API wire payload to the backend chat service still uses
    `experimentalV2` until the backend rename lands separately.
- **`QuerriEmbedOptions.theme` is now typed as `QuerriThemeConfig`**
  rather than `Record<string, unknown>`. Source-compatible if you were
  passing an object literal with `--`-prefixed keys; flagged if you
  were passing nested non-string values.

### Docs

- README, `docs/api-guide.md`, `docs/server-sdk.md`, and JSDoc on the
  React / Vue / Angular `startView` props now reference `/dashboard/{uuid}`
  and `/chat/{uuid}` instead of the deprecated `/builder/dashboard/{uuid}`
  path. The staging app silently rewrites `/builder/` paths but logs a
  transient `[Builder Error] Not found` to the console; the new docs
  recommend the canonical paths directly.
- README + `docs/api-guide.md` now document the full `chrome.chat`
  surface, the `theme.scheme` / `theme.colors` shape, and a custom
  welcome-screen example.

## [0.2.0] — 2026-04-22

### Breaking Changes

- **`DataResource` method names** now match the CRUD verbs used by every
  sibling resource (`users`, `projects`, `policies`):
  - `sources()` → `list()`
  - `source(id)` → `retrieve(id)`
  - `createSource(params)` → `create(params)`
  - `deleteSource(id)` → `del(id)`
  - `replaceData(id, params)` → `replaceRows(id, params)` (parity with `appendRows`)
  - `sourceData(id, params)` → `getSourceData(id, params)` (parity with `getStepData`)

  `query()` and `appendRows()` keep their names.

### Fixed

- **`startView` scoped to initial init** (`src/core/querri-embed.js`):
  `_buildConfig()` previously defaulted `startView` to `/home` and included
  it on every `{type: 'init'}` postMessage, including re-inits triggered by
  `session-expired` / `auth-required` refetches in `fetchSessionToken` and
  popup-login modes. Once a token TTL expired the iframe was yanked back to
  `/home` regardless of where the user had navigated. Fixed by tracking
  `_hasAuthenticated` (persists across `session-expired`, unlike
  `self.ready` which resets) and gating `startView` on it — the initial
  init still carries `startView`, every subsequent re-init omits it.
- **SSE decoder** (`src/server/streaming/sse-decoder.ts`): events whose
  lines spanned chunk boundaries — or whose terminating blank line arrived
  in a later chunk — were being silently dropped because `currentEvent`
  was re-declared on every read. The flush path also only handled
  `data:` and dropped any trailing `event:` / `id:` / `retry:` fields.
  Both bugs are now fixed; `currentEvent` persists across the read loop
  and a shared `appendLine` helper is used by both the main loop and the
  flush path.
- **Missing type imports** for `ChatDeleteResponse`, `ProjectDeleteResponse`,
  and `DashboardDeleteResponse` — `del()` return types were unresolved in
  `tsc --noEmit` even though the types existed in `types.ts`.
- **`maxRetries` JSDoc** now matches the runtime default of `3`.
- **Angular type re-exports**: `QuerriSessionEndpointAuth` and
  `QuerriErrorCode` are now re-exported from `@querri-inc/embed/angular`.
- **`QuerriEmbed.version`** now reports the actual package version at
  runtime. Previously the shipped bundle reported `'0.0.0-test'` because
  the test placeholder escaped the version-bump regex.

### Changed

- **`share*` APIs** migrated to a params-object signature
  (`shareProject(projectId, { user_id, permission, expires_at })`), a
  `SharePermission` type alias is now exported, and `revoke*Share` / `del()`
  return types are unified across resources.
- **Nuxt integration**: the previous dual-handler surface was collapsed
  into a single typed handler; h3's `any`/`Function` types replaced with
  a proper `H3Module` interface; origin-fallback logic extracted.
- **`HttpClient.buildUrl`** rewritten to construct the URL once;
  `APIConnectionError` now carries a proper `Error.cause` chain.
- **Core embed `_init`**: validation, mode selection, and per-mode event
  dispatch are now consolidated through a `classifyAuth` helper and an
  `_authStrategy` object — fixing the three `var self` declarations and
  collapsing duplicate send-init branches in the message listener.
- **`raiseForStatus` → `throwForStatus`** in `src/server/errors.ts` so the
  verb matches the rest of the TypeScript codebase. Internal symbol only
  (not re-exported from `src/server/index.ts`).
- **Server integration sweep**: dropped unused imports, inverted the
  express/angular shim, tagged back-compat aliases `@deprecated`.

### Added

- Direct tests for the `sse-decoder` (10 cases: multi-line data, comments,
  `event`/`id`/`retry` handling, chunk-boundary reassembly).
- Pure-function tests for `normalizePage` (6 cases covering the public,
  internal-keyed, bare-array, and empty-envelope paths).
- `asUser()` wiring test asserting the outgoing request carries
  `X-Embed-Session` (and omits `Authorization: Bearer qk_*`).
- Path/method smoke tests for all ten server resources (`audit`, `chats`,
  `dashboards`, `data`, `files`, `keys`, `projects`, `sharing`, `sources`,
  `usage`) — 58 new tests, covering every public method's URL shape and
  HTTP verb.

### Internal

- `tests/rls-integration.test.ts` renamed to `tests/rls-integration.script.ts`
  to reflect that it's a tsx-run integration script, not a vitest test.
  Hardcoded localhost API key and absolute `RLS_TEST_CSV_PATH` removed in
  favour of `requireEnv`.
- `.desloppify/` state directory now `.gitignore`d.
- Vitest no longer logs happy-dom's `Iframe page loading is disabled`
  noise during iframe-creating tests.

---

For releases prior to `0.2.0`, see the git log.
