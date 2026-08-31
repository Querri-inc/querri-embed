# Changelog

All notable changes to `@querri-inc/embed` are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Prior to `1.0.0`, minor version bumps may contain breaking changes.

## [Unreleased]

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
